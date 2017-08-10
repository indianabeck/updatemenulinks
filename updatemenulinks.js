//npm install nodegit
//npm install --save fs-extra
//npm install --save walk

/*jshint esversion: 6 */
//usage: node updatemenulinks "repo_you_want_to_clone.git" "branch_you_want_to_use" "/root_path_to_the_html_files" "h2_header_text"

class makePathParts {
  constructor() {
    this.url = args[2] == null ? 'https://github.com/indianabeck/updatemenulinks.git' : args[2];
    var words = this.url.split('/');
    var base = words[words.length - 1].replace('.git', '');
    this.local = './' + base;
    this.branchToCheckout = args[3] == null ? 'master' : args[3];
    this.baseroot = args[4] == null ? '/MyRepositories/updatemenulinks/' : args[4];
    this.pagetitle = args[5] == null ? 'Named Links' : args[5];
  }
}
var nodegit = require('nodegit');
var fs = require('fs-extra');
var walk = require('walk');

var args = process.argv;
var files = [];

const pathparts = new makePathParts();
var url = pathparts.url;
var local = pathparts.local;
var branchToCheckout = pathparts.branchToCheckout;
var baseroot = pathparts.baseroot;
var pagetitle = pathparts.pagetitle;

var lastCommit = '';
var lastbase = '';

// delete the local branch and its contents
fs.removeSync(local);

//when authentication is required, credentials is called
var cloneOpts = {
  fetchOpts: {
    callbacks: {
      credentials: function(url) {
        var username = process.env.nodegitun;
        var userpassword = process.env.nodegitpw;
        return nodegit.Cred.userpassPlaintextNew(username, userpassword);
      }
    }
  }
};

// Clone repository
nodegit.Clone(url, local, cloneOpts).then(function(repo) {}).then(function() {
  console.log("Cloned " + url + " to " + local);
  //createLocalBranch();
}).then(function() {
  createLocalBranch();
}).catch(function(err) {
  console.log(err);
});

// getBranchCommit
function createLocalBranch() {
  nodegit.Repository.open(local).then(function(repo) {
    return repo.getBranchCommit('origin/' + branchToCheckout).then(function(ref) {
      lastCommit = ref;
      console.log("Last Commit " + ref);
    }).then(function() {
      // Create local branch
      var force = 1;
      repo.createBranch(branchToCheckout, lastCommit, force).then(function(reference) {
        changeBranch();
      });
    });
  }).catch(function(err) {
    console.log(err);
  });
}

//Change Branch
function changeBranch() {
  nodegit.Repository.open(local).then(function(repo) {
    return repo.getCurrentBranch().then(function(ref) {
      console.log("On " + ref.shorthand() + " " + ref.target());

      console.log("Checking out " + branchToCheckout);
      var checkoutOpts = {
        checkoutStrategy: nodegit.Checkout.STRATEGY.FORCE
      };
      return repo.checkoutBranch(branchToCheckout, checkoutOpts);
    }).then(function() {
      return repo.getCurrentBranch().then(function(ref) {
        console.log("On " + ref.shorthand() + " " + ref.target());
        createMenu();
      });
    });
  }).catch(function(err) {
    console.log("error: " + err);
  }).done(function() {
    console.log('-'.repeat(100));
  });
}

/*  Create the Menu Items */
function createMenu() {
  // Walker options
  var walker = walk.walk(baseroot, {
    followLinks: false
  });

  walker.on('file', function(root, stat, next) {
    // See if we want to add this file to the list of files
    if ((stat.name.substr(-4) === 'html' && stat.name.substr(-8) !== 'isi.html') && !root.includes("\\layout")) {
      var emailroot = root.replace(baseroot, '').replace(/\\/g, '/');
      var words = emailroot.split('/');
      var base = words[1];
      var anchorword = emailroot.replace(base, '').replace('//', '/');
      var anchorstring = '<li><a href="' + emailroot + '/';
      anchorstring += stat.name + '">' + anchorword + '/' + stat.name + '</a></li>';
      files.push(anchorstring);
      //files.push(anchorstring.toLowerCase());
    }

    next();
  });

  walker.on('end', function() {
    files.sort();
    console.log('<h2>' + pagetitle + ' (' + branchToCheckout +')' + '</h2>');
    var arrayLength = files.length;
    for (var i = 0; i < arrayLength; i++) {
      var words = files[i].split('/');
      var base = words[1];
      if (base !== lastbase) {

        if (lastbase !== '')
          console.log('</ul>');

        console.log('<h3>' + base + '</h3>');
        console.log('<ul>');
        lastbase = base;
      }
      console.log(files[i]);
    }
    console.log('</ul>');
  });

}
