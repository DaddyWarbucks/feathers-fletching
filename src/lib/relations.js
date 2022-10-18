const joinQuery = () => {};
const transformJoinQuery = () => {};
const resolve = () => {};

const props = [
  'targetService',
  'targetKey',
  'targetName',
  'foreignService',
  'foreignKey',
  'foriegnName'
];

class RelationsManager {
  constructor({ app, relations }) {
    this.app = app;
    // this.id = id || 'id';
    this.relations = relations || [];
  }

  service(serviceName) {
    return {
      relate: (foreignService, options) => {
        return this.relate(serviceName, foreignService, options);
      },
      describe: () => {
        return this.describe(serviceName);
      },
      validate: params => {
        return this.validate(serviceName, params);
      },
      joinQuery: query => {
        return this.joinQuery(serviceName, query);
      },
      hydrate: (targetResult, resolvers) => {
        return this.hydrate(serviceName, targetResult, resolvers);
      }
    };
  }

  relate(targetService, foreignService, options) {
    options = {
      ...options,
      targetService,
      foreignService
    };

    const found = this.relations.find(relation => {
      return props.every(prop => options[prop] === relation[prop]);
    });

    if (found) {
      throw new Error('Relationship already exists');
    }

    this.relations.push({
      targetService,
      foreignService,
      ...options
    });
  }

  async validate(serviceName, params) {
    const [targetRelations, foreignRelations] = this.describe(serviceName);

    if (!targetRelations.length || !foreignRelations.length) {
      return [];
    }

    const results = await this.app.service(serviceName).find({
      ...params,
      paginate: false
    });

    const promises = [];
    const relations = [];

    results.forEach(serviceResult => {
      targetRelations.forEach(relation => {
        const { foreignKey, targetKey, foreignService } = relation;
        promises.push(async () => {
          // targetKey may be an id or an array of ids.
          // For example, { userId: 1 } or { userId: [1] }
          // But, this query does not know what DB adapter the service
          // uses and also does not know if it is an array or not. So this
          // query simply uses [targetKey]: result[foreignKey] without
          // attempting to use $contains, $includes, etc. It is up to
          // the targetService to massage the query if needed.
          const result = await context.app.service(foreignService).find({
            query: {
              [foreignKey]: serviceResult[targetKey],
              $select: [foreignKey],
              paginate: false
            }
          });
          relations.push({
            ...relation,
            result
          });
        });
      });

      foreignRelations.forEach(relation => {
        const { foreignKey, targetKey, targetService } = relation;
        promises.push(async () => {
          // targetKey may be an id or an array of ids.
          // For example, { userId: 1 } or { userId: [1] }
          // But, this query does not know what DB adapter the service
          // and also does not know if it is an array or not. So this
          // query simply uses [targetKey]: result[foreignKey] without
          // attempting to use $contains, $includes, etc. It is up to
          // the targetService to massage the query if needed.
          const result = await context.app.service(targetService).find({
            query: {
              [targetKey]: serviceResult[foreignKey],
              $select: [targetKey],
              paginate: false
            }
          });
          relations.push({
            ...relation,
            result
          });
        });
      });
    });

    await Promise.all(promises);

    const valid = relations
      .filter(relation => relation.foreignService === serviceName)
      .every(relation => relation.result.length === 0);

    return {
      valid,
      relations
    };
  }

  async joinQuery(serviceName, query) {
    const options = {};
    const [targetRelations, foreignRelations] = this.describe(serviceName);

    targetRelations.forEach(
      ({ targetName, targetKey, foreignKey, foreignService }) => {
        options[targetName] = {
          service: foreignService,
          foreignKey: targetKey,
          targetKey: foreignKey
        };
      }
    );

    foreignRelations.forEach(
      ({ foreignName, targetKey, foreignKey, targetService }) => {
        options[foreignName] = {
          service: targetService,
          foreignKey: foreignKey,
          targetKey: targetKey
        };
      }
    );

    const joinQuery = await transformJoinQuery(query, options);

    return joinQuery;
  }

  async hydrate(serviceName, result) {
    const resolvers = this.resolvers(serviceName);
    const context = { app: this.app, params: { loader } };
    return resolve(result, context, resolvers);
  }

  dehydrate(serviceName, result) {
    const [targetRelations, foreignRelations] = this.describe(serviceName);
    result = { ...result };
    targetRelations.forEach(({ targetName }) => {
      delete result[targetName];
    });
    foreignRelations.forEach(({ foreignName }) => {
      delete result[foreignName];
    });
    return result;
  }

  resolvers(serviceName) {
    const resolvers = {};
    const [targetRelations, foreignRelations] = this.describe(serviceName);

    targetRelations.forEach(
      ({ targetName, targetKey, foreignKey, foreignService }) => {
        resolvers[targetName] = (result, context) => {
          if (!result[targetKey]) {
            return null;
          }
          return context.params.loader
            .service(foreignService)
            .key(foreignKey)
            .load(result[targetKey]);
        };
      }
    );

    foreignRelations.forEach(
      ({ foreignName, targetKey, foreignKey, targetService }) => {
        resolvers[foreignName] = (result, context) => {
          if (!result[foreignKey]) {
            return null;
          }
          return context.params.loader
            .service(targetService)
            .key(targetKey)
            .load(result[foreignKey]);
        };
      }
    );

    return resolvers;
  }

  describe(serviceName) {
    const targetRelations = [];
    const foreignRelations = [];

    this.relations.forEach(relation => {
      if (relation.targetService === serviceName) {
        targetRelations.push(relation);
      }
      if (relation.foreignService === serviceName) {
        foreignRelations.push(relation);
      }
    });

    return [targetRelations, foreignRelations];
  }
}

const relationships = new RelationsManager({});

relationships.service('api/shipments').relate('api/shipper', {
  targetKey: 'shipper_id',
  targetName: 'shipper',
  foreignKey: 'id',
  foreignName: 'shipments'
});

const shipmentsQuery = {
  '$shipper.name$': 'FutureProof'
};

const shipperQuery = {
  '$shipments.address_id$': '1'
};
