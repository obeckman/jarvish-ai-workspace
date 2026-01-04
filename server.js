//node server.js

/* global require */
//const jsonServer = require('json-server');
import jsonServer from 'json-server';

const server = jsonServer.create();
const router = jsonServer.router('api.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);

server.get('/more-items', (req, res) => {
  const { lastId = 0, limit = 10 } = req.query;
  const db = router.db; // Access lowdb instance
  
  
  console.log('db',db.get('useInfiniteVirtualizedScroll'));
  // Filter items greater than the provided ID
  const items = db.get('useInfiniteVirtualizedScroll')
    .filter(item => item.id > parseInt(lastId))
    .take(parseInt(limit))
    .value();

  const lastItem = items[items.length - 1];
  const total = db.get('useInfiniteVirtualizedScroll').size().value();

  res.jsonp({
    items: items,
    paginationInfo: {
      total: total,
      nextPageId: lastItem ? lastItem.id : null,
      hasMore: items.length === parseInt(limit)
    }
  });
});

server.use(router);
server.listen(3000, () => {
  console.log('JSON Server is running');
});