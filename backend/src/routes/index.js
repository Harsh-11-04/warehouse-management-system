const router = require("express").Router();


const routes = [
    {
        path: '/auth',
        route: require("./Auth.route")
    },
    {
        path: '/consumer',
        route: require("./Consumer.route")
    },
    {
        path: '/orders',
        route: require("./Order.route")
    },
    {
        path: '/product',
        route: require("./Product.route")
    },
    {
        path: '/warehouse',
        route: require("./Warehouse.route")
    },
    {
        path: '/stock',
        route: require("./StockLocation.route")
    },
    {
        path: '/shipment',
        route: require("./Shipment.route")
    },
    {
        path: '/report',
        route: require("./Report.route")
    },
    {
        path: '/activity-log',
        route: require("./ActivityLog.route")
    },
    {
        path: '/reorder-suggestions',
        route: require("./ReorderSuggestion.route")
    }
]


routes.forEach((cur) => {
    router.use(cur.path, cur.route);
})

module.exports = router