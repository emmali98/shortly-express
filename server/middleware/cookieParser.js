const parseCookies = (req, res, next) => {
  if (!req.get('Cookie')) {
    req.cookies = {};
    next();
    return;
  }

  var cookieString = req.get('Cookie');
  var pairs = cookieString.split(';').map((pair) => pair.trim());

  var cookie = {};
  pairs.forEach((pair) => {
    var pairArray = pair.split('=');
    cookie[pairArray[0]] = pairArray[1];
  });

  req.cookies = cookie;
  next();
};

module.exports = parseCookies;
