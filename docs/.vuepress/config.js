module.exports = {
  title: 'feathers-fletching',
  description: 'A collection of hooks and utilities to make your FeathersJS apps fly straight and true.',
  base: "/feathers-fletching/",
  themeConfig: {
    logo: '/logo.svg',
    // smoothScroll: true,
    repo: 'daddywarbucks/feathers-fletching',
    docsDir: 'docs',
    editLinks: true,
    sidebar: [
      './overview.md',
      '/hooks.md',
      '/plugins.md',
      '/utilities.md'
    ],
    serviceWorker: {
      updatePopup: true
    }
  }
}
