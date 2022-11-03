"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, "../../.env.example") });
const airtable_1 = __importDefault(require("airtable"));
const axios_1 = __importDefault(require("axios"));
airtable_1.default.configure({
    endpointUrl: 'https://api.airtable.com',
    apiKey: process.env.AIRTABLE_API_KEY
});
const base = airtable_1.default.base(process.env.AIRTABLE_BASE_ID);
const zoteroUser = "https://api.zotero.org/users/" + process.env.ZOTERO_USER_ID;
/**
 * Processing
 */
/**
 *
 * @param {array of authors of entry} creators
 * @returns string of authors separated by ;
 */
const parseCreators = (creators) => {
    let creatorsString = "";
    if (creators.length != 0)
        creatorsString = creators[0].lastName + ", " + creators[0].firstName;
    for (let j = 1; j < creators.length; j++) {
        creatorsString += "; " + creators[j].lastName + ", " + creators[j].firstName;
    }
    return creatorsString;
}; // TODO: adjust this function for eventual sorting by unique authors
/**
 *
 * @param note
 * @returns map of annotations
 */
function parseAnnotations(note) {
    //ignore first set of tags up to first entry
    let tags = note.split("<p>").slice(1);
    // clean up content
    let map = {
        blue: [],
        green: [],
        yellow: []
    };
    for (let i = 0; i < tags.length; i++) {
        let idx = tags[i].indexOf("background-color: ") + ("background-color: ".length) + 1; //for #
        let color = tags[i].substring(idx, idx + 8);
        idx += 9; //jump forward to >
        let bodyIdx = tags[i].indexOf("“");
        let bodyEndIdx = tags[i].indexOf("”");
        let bodyText = tags[i].substring(bodyIdx + 1, bodyEndIdx); // ignore weird quotation marks
        console.log(bodyText);
        console.log(color);
        if (color == "83ffed80") {
            map["blue"].push(bodyText);
        }
        else if (color == "00ff0080") {
            map["green"].push(bodyText);
        }
        else if (color == "ffff0080") {
            map["yellow"].push(bodyText);
        }
    }
    return map;
}
/*** Zotero
 * Get recently uploaded or modified entries
 */
/**
 *
 * @param {number of entries to query} amt
 */
const getMostRecentPapersUpdated = (amt) => {
    try {
        let url = zoteroUser + "/items/top";
        return axios_1.default.get(url, {
            headers: {
                "Zotero-API-Key": process.env.ZOTERO_API_KEY,
            },
            params: {
                sort: "dateModified",
                limit: amt,
                format: "json",
                direction: "desc"
            }
        });
        /*for (i = 0; i < req.data.length; i++){
           console.log(req.data[i].key)
           console.log(req.data[i].data.title)
           console.log(parseCreators(req.data[i].data.creators))
           console.log(req.data[i].data.itemType)
           console.log(req.data[i].data.dateAdded)
           console.log(req.data[i].data.dateModified)
         }*/
    }
    catch (error) {
        throw (error);
    }
};
/**
*
* @param {number of entries to query} amt
*/
const getMostRecentPapersAdded = (amt) => {
    try {
        let url = zoteroUser + "/items/top";
        return axios_1.default.get(url, {
            headers: {
                "Zotero-API-Key": process.env.ZOTERO_API_KEY,
            },
            params: {
                sort: "dateAdded",
                limit: amt,
                format: "json",
                direction: "desc"
            }
        });
        /*for (i = 0; i < req.data.length; i++){
         console.log(req.data[i].key)
         console.log(req.data[i].data.title)
         console.log(parseCreators(req.data[i].data.creators))
         console.log(req.data[i].data.itemType)
         console.log(req.data[i].data.dateAdded)
         console.log(req.data[i].data.dateModified)
       }*/
    }
    catch (error) {
        throw error;
    }
};
/*** Airtable
 * Write Zotero records to papers or quotes table(s)
 */
const putMostRecentPapersAdded = (data) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // function to get data from req
        //obj = JSON.parse(entry)
        for (let i = 0; i < data.length; i++) {
            console.log(data[i].key);
            console.log(data[i].title);
            console.log(parseCreators(data[i].creators));
            console.log(data[i].itemType);
            console.log(data[i].dateAdded);
            console.log(data[i].dateModified);
        }
        /*base('References').create([
          {
            "fields": {
              "Title": obj.data.title,
              "Authors": obj.data.creators,
              "Key": obj.key,
              "Type": obj.data.itemType,
            }
          },
        ], function(err, records) {
          if (err) {
            console.error(err);
            return false;
          }
          records.forEach(function (record) {
            console.log(record.getId());
          });
        });*/
    }
    catch (error) {
        console.error(error);
    }
});
/**
 * API Calls to Airtable, pulling things from Airtable to zotero
 * */
/*const getItem = async(key) => {
  try {
    let url = zoteroUser + "/items/" + key + "/children"
    
    return await axios.get(url, {
        headers: {
            "Zotero-API-Key": process.env.ZOTERO_API_KEY,
        },
        params: {
            format: "json"
        }
    })
  } catch (error) {
    console.error(error)
  }
}

// Airtable - References
const addRefEntry = (entry) => {
  // if entry is not note type then add reference(s)
  obj = JSON.parse(entry)
  if (obj.data.itemType == 'note') {
    return false
  }

  base('References').create([
    {
      "fields": {
        "Title": obj.data.title,
        "Authors": obj.data.creators,
        "Key": obj.key,
        "Type": obj.data.itemType,
      }
    },
  ], function(err, records) {
    if (err) {
      console.error(err);
      return false;
    }
    records.forEach(function (record) {
      console.log(record.getId());
    });
  });
  return true
}

const updateRefEntry = (title) => {
base('References').update([
  {
    "Key": obj.key,
    "fields": {
      "Title": obj.data.title,
      "Authors": obj.data.creators,
      "Key": obj.key, // make ID
      "Type": obj.data.itemType
    },
  }
], function(err, records) {
  if (err) {
    console.error(err);
    return;
  }
  records.forEach(function(record) {
    console.log(record.get('Authors'));
  });
});
}

// Airtable - Quotes
const addQuoteEntry = (entry) => {
  obj = JSON.parse(entry)
  if (obj.data.itemType == 'note') {
    return false
  }

  // MAKE SURE TO ADD REFERENCE TO REF TABLE WITH QUOTE KEY
  base('Quotes').create([
    {
      "fields": {
        "Quote": obj.data.note,
        "Key": obj.key, // make ID
        "Color": obj.data.tags,
        "Back ref": obj.data.parentItem
      }
    },
  ], function(err, records) {
    if (err) {
      console.error(err);
      return false;
    }
    records.forEach(function (record) {
      console.log(record.getId());
    });
  });
  return true
}

const updateQuoteEntry = (title) => {
base('Quotes').update([
  {
    "Key": obj.key,
    "fields": {
      "Title": obj.data.title,
      "Authors": obj.data.creators,
      "Key": obj.key, // make ID
      "Type": obj.data.itemType
    },
  }
], function(err, records) {
  if (err) {
    console.error(err);
    return;
  }
  records.forEach(function(record) {
    console.log(record.get('creators'));
  });
});
}*/
/*
function filteredOutput(obj){
  for (o in obj) {
    console.log(obj[0])
    key = obj[o].key
    objdata = obj[o].data
    itemType = objdata.itemType
    data = {}
    if (itemType == 'note') { // is this the right thing to use?
      data.parentItem = objdata.parentItem
      data.dateModified = objdata.dateModified
    } else if ("parentItem" in objdata) {
      /*const item = await getItem(objdata.parentItem)
      // get parentItem
      item.data.title
      data.title = item.data.title
      //data.creators = objdata.creators.toString()
      data.dateModified = item.data.dateModified*/
//console.log("parentItem")
//} //else {continue}
//console.log(key, data, itemType, data)
//}
//}
(() => __awaiter(void 0, void 0, void 0, function* () {
    let resp = yield getMostRecentPapersUpdated(2);
    //let data2 = await getMostRecentPapersAdded(2);
    /*for(let x of data) {
        console.log(x)
    }*/
    yield putMostRecentPapersAdded(resp.data);
    //await putMostRecentPapersUpdated(resp.data);
}))();
// Eventually
// update tags (airtable to zotero)
// update notes (airtable summary to zotero) (new note?)
// checking for matches to update either zotero or airtable
// make authors table to link papers
// automating it on triggers (e.g. new paper added, new note)
// creating UI
// make this more like an api for future proofing?
//printItem("TF97389V")
// What could I need
// Currently have split of notes by color (things can't be multicolor.)
/*
usage
paper added
call api w/ # papers added (sort through X to find papers, add notes separately if found)
update airtable with papers
*/
/*
api calls
zotero side
get recent updates (n) (shortened summary for preview to confirm actions)
get recently added (n) (shortened summary for preview to confirm actions)

airtable side
put recent updates (n)
- flag to not include notes ?
- check if note exists (what if note updates, save update - how check for what updated?)
*/
/*
paper annotated
call api w/ # notes added (sort through X to find notes, add papers separately if found)
update airtable w/ quotes + link back/backref on main table?

- flag to not include notes ?
- check if paper parent key exists if not add

notes will share same key id and parent key? how differentiate? list of entries under color or other?
need to parse out citation for page number use regex though
*/
// values updated 
// go to interface to add summary from filter on yellow/green colors (savable?)
