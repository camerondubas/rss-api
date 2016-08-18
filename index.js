'use strict';

// TODO: Add optional "Force Refresh" Option
// TODO: Cleanup Error Handling

let express = require('express');
let app = express();

let FeedParser = require('feedparser');
let request = require('request');
let utils = require('./utils');

let NodeCache = require('node-cache');
let cache =  new NodeCache();

app.set('port', (process.env.PORT || 3000));

app.use(utils.allowCrossDomain);
app.use('/feed', (req, res, next) => {
  let url = req.query.url || undefined;
  const CACHE_EXPIRY_SECONDS = 3600; // 60 Minutes
  const EXPIRY_REFRESS_MILLISECONDS = 600000; // 10 Minutes;

  // Validate Request
  if (!url) {
    res.statusCode = 500;
    return res.send('No URL Provided');
  }

  if (!utils.isURL(url)) {
    res.statusCode = 500;
    return res.send('URL is Invalid');
  }

  // Check for cached version
  let cachedFeed = cache.get(url);
  if (cachedFeed) {
    next(cachedFeed);

    if (cache.getTtl(url) - Date.now() < EXPIRY_REFRESS_MILLISECONDS) {
      fetchFeed().then(
        feedItems => cache.set(url, feedItems, CACHE_EXPIRY_SECONDS),
        err => console.log(err)
      );
    }

  } else {
    fetchFeed().then(
      feedItems => {
        cache.set(url, feedItems, CACHE_EXPIRY_SECONDS);
        next(feedItems);
      },
      err => console.log(err)
    );
  }

  function fetchFeed() {
    return new Promise((resolve, reject) => {
      let feedparser = new FeedParser();

      let feed = request(url);
      let items = [];

      feed.on('error', () => {
        res.statusCode = 500;
        return res.send('Error Fetching Feed. Please double check URL is correct');
      });

      feed.on('response', res => {
        if (res.statusCode !== 200) {
          return this.emit('error', 'Bad status code');
        }

        res.pipe(feedparser);
      });

      // TODO: Handle FeedParser Error
      // feedparser.on('error', () => {});

      feedparser.on('readable', function() {
        items.push(this.read());
      });

      feedparser.on('end', () => resolve(items));
    });
  }
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