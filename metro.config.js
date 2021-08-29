const blacklist = require("metro-config/src/defaults/blacklist");

module.exports = {
  resolver: {
    // Exclude files from the final app bundle
    blacklistRE: blacklist([/.*assets\/raw-images.*/, /.*test.js/]),
  },
};
