const fs = require('fs');
const path = require('path');
const LineByLineReader = require('line-by-line');
const PARENTPATH = 'D:/XXX';

//DB
const mongoose = require('mongoose');
mongoose.set('useCreateIndex', true);
mongoose.set('debug', false);
mongoose.connect('mongodb://localhost/XXX', {useNewUrlParser: true,   useUnifiedTopology: true});
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;
const FileLineModel = mongoose.model('FileLineModel',new Schema ({
  file: String,
  lineDB: String
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
walkSync=walkSync(PARENTPATH,null);

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
      let status2; //flag to pause or resume the stream
      let intervl;//interval
      let count = 0 ;//count how many seconds waits when inserts on mongoDB
      let lr; //data stream
      let tempArray = [];
      
      //each file
      for (let i = 0; i < walkSync.length; i++) {
        lr = new LineByLineReader(walkSync[i]);
        status = true;
        tempArray = [];
        console.log(i + ' - ' + walkSync[i]);
        
        //each line
        lr.on('line', function (line) {
          count = 0;
          status2 = true;
          tempArray.push({file:walkSync[i],lineDB: line});//insert on array
          if (tempArray.length == 100000) {//every 100.000 lines, insert
            lr.pause();//pause streaming
            FileLineModel.insertMany(tempArray, {ordered:false, w:0}, function (err, docs) {//insert on mongoDB
              status2 = false;
            });
            intervl = setInterval(function(){//every second verify if has inserted all on mongoDB
              count++;
              console.log('pause'+count);
              if (!status2) {
                lr.resume();
                clearInterval(intervl);
                tempArray = [];
                console.log('-End pause-');
              }
            }, 1000);
          }
        })
        lr.on('end', function () {//file finished 
          FileLineModel.insertMany(tempArray, {ordered:false, w:0}, function (err, docs) {//insert on mongoDB
            status = false;
          });
          console.log(walkSync[i]+' CLOSED');
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
    let comienza = await new test(); //start
  }
  catch(e) {
    console.log(e);
  }
})();
