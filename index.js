'use strict';

let express = require('express');
let FeedParser = require('feedparser');
let feedparser = new FeedParser();
let request = require('request');
let utils = require('./utils');

let app = express();

app.set('port', (process.env.PORT || 3000));

app.use(utils.allowCrossDomain);
app.use('/feed', (req, res, next) => {
  let url = req.query.url || undefined;

  if (!url) {
    res.statusCode = 500;
    return res.send('No URL Provided');
  }

  if (!utils.isURL(url)) {
    res.statusCode = 500;
    return res.send('URL is Invalid');
  }

  let feed = request(url);
  let items = [];

  feed.on('error', () => {
    res.statusCode = 500;
    return res.send('Error Fetching Feed. Please double check URL is correct');
  });

  feed.on('response', res => {
    if (res.statusCode !== 200) {
      return this.emit('error', new Error('Bad status code'));
    }

    res.pipe(feedparser);
  });

  feedparser.on('error', () => {
    // res.statusCode = 500;
    // return res.send('Error Parsing Feed. Please double check URL is an RSS Feed');
  });


  feedparser.on('readable', function() {
    let item;
    while (item = this.read()) {
      items.push(item);
    }
  });

  feedparser.on('end', () => next(items));
});


app.use('/', (req, res) => {
  res.send('<h1>RSS API</h1>')
});

// Catch 404
app.use((req, res, next) => res.status(404).send(`<h1>Error 404: Cannot ${req.method} ${req.url}.</h1>`));

// Handle Response
app.use((data, req, res, next) => {
  let status = data.status === undefined ? 200 : (data.status || 533);
  res.status(status).send(data);
});

app.listen(app.get('port'), () => {
  console.log('Listening on port', app.get('port'));
});
