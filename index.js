'use strict';

let express = require('express');
let FeedParser = require('feedparser');
let feedparser = new FeedParser();
let request = require('request');
let utils = require('./utils');

let app = express();

app.use('/feed', (req, res) => {
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
    res.statusCode = 500;
    return res.send('Error Parsing Feed. Please double check URL is an RSS Feed');
  });


  feedparser.on('readable', function() {
    let item;
    while (item = this.read()) {
      items.push(item);
    }
  });

  feedparser.on('end', () => res.send(items));
});

app.listen(3000, () => {
  console.log('Listening on port 3000');
});
