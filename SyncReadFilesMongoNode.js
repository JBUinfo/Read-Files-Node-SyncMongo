const fs = require('fs');
const path = require('path');
const es = require('event-stream');
const PATHPADRE = 'D:/XXX';
//emails
const re = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i);

//DB
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('debug', false);
mongoose.connect('mongodb://localhost/XXX', {useNewUrlParser: true});
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
      let lr; //data stream
      let user;//substring
      let pass;//substring
      let countMongo;
      let countValid;
      let countInvalid;
      //each file
      for (let i = 0; i < walkSync.length; i++) {
        status = true;
        countMongo = 0;
        countValid = 0;
        countInvalid = 0;
        console.log(i + ' - ' + walkSync[i]);
        //each line
        lr = fs.createReadStream(walkSync[i]).pipe(es.split()).pipe(es.mapSync(function(line){
            user = '';
            pass = '';
            if (line.includes("@")) {
              countValid++;
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
                Accounts.create({
                    file:walkSync[i],
                    user: user,
                    pass: pass
                },function (err, small) {
                    countMongo++;
                    if (err) return err;
                  }
                );
              } else {
                countValid--;
                countInvalid++;
              }
            }
          }))
          .on('end', async function () {//when finish the file
            while (countValid>countMongo) {
              console.log('LOOOOOOP');
              await sleep(3000);
            }
            status = false;// close the loop "while" and pass to the next file
            console.log('Valid: '+countValid+' --- Mongo: '+countMongo+' --- Invalid: '+countInvalid);
            console.log(walkSync[i]+' CLOSED');
          });
        while(status) {
          await sleep(5000);//this make the loop of files sync
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
