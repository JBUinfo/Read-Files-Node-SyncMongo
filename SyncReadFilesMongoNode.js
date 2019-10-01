const fs = require('fs');
const path = require('path');
const LineByLineReader = require('line-by-line');
const PATHPADRE = 'D:/XXX';
//emails
const re = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i);

//DB
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('debug', false);
mongoose.connect('mongodb://localhost/XXX', {useNewUrlParser: true,   useUnifiedTopology: true});
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const Accounts = mongoose.model('accounts',new Schema ({
  file: String,
  user: String,
  pass: String
},{versionKey: false}));

//Return every .txt file
let walkSync = function(dir, filelist) {
  let files = fs.readdirSync(dir);
  filelist = filelist || [];
  files.forEach(function(file) {
    if (fs.statSync(path.join(dir, file)).isDirectory()) {
      filelist = walkSync(path.join(dir, file), filelist);
    }
    else {
      filelist.push(path.join(dir, file));
    }
  });
  return filelist;
};
walkSync=walkSync(PATHPADRE,null);

function sleep(ms){
  return new Promise(resolve=>{
    setTimeout(resolve,ms)
  })
}

const test = class {
  constructor() {
  }
  async then(resolve, reject) {
    try {
      let status; //flag to make it sync
      let status2;
      let a;
      let lr; //data stream
      let user;//substring
      let pass;//substring
      let arrray = [];
      //each file
      for (let i = 1872; i < walkSync.length; i++) {
        lr = new LineByLineReader(walkSync[i]);
        status = true;
        arrray = [];
        console.log(i + ' - ' + walkSync[i]);
        //each line
        lr.on('line', function (line) {
          status2 = true;
          user = '';
          pass = '';
          if (line.includes("@")) {
            if (line.includes(":")) {
              user = line.substring(line.indexOf(":") , line.indexOf(''));
              pass = line.substring(line.indexOf(":") + 1);
            } else if (line.includes(";")) {
              user = line.substring(line.indexOf(";") , line.indexOf(''));
              pass = line.substring(line.indexOf(";") + 1);
            } else if (line.includes("|")) {
              user = line.substring(line.indexOf("|") , line.indexOf(''));
              pass = line.substring(line.indexOf("|") + 1);
            } else if (line.includes("||")) {
              user = line.substring(line.indexOf("||") , line.indexOf(''));
              pass = line.substring(line.indexOf("||") + 1);
            }
            if (pass != '' & re.test(String(user).toLowerCase())) {
              arrray.push({file:walkSync[i],user: user,pass: pass});
              if (arrray.length == 100000) {
                lr.pause();
                Accounts.bulkWrite(arrray, {ordered:false, w:0}, function (err, docs) {
                  status2 = false;
                });
                a = setInterval(function(){
                  console.log('pausa');
                  if (!status2) {
                    lr.resume();
                    clearInterval(a);
                    arrray = [];
                    console.log('-Fin pausa-');
                  }
                }, 500);
              }
            }
          }
        })
        lr.on('end', function () {
          console.log(walkSync[i]+' CLOSED');
          Accounts.bulkWrite(arrray, {ordered:false}, function (err, docs) {
            status = false;
          });
        });

        while(status) {
          await sleep(2000);//this make the loop of files sync
        };
      }
      resolve();
    }
    catch(e) {
      console.log(e);
    }
  }
};

(async() => {
  try {
    await sleep(2000);//make sure the connection with mongo
    let comienza = await new test(); //start
    await sleep(15000);//await to make sure that the pool of mongoose insert all the lines
  }
  catch(e) {
    console.log(e);
  }
})();
