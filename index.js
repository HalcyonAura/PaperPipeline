// to run node index.js

require('dotenv').config()
const Airtable = require('airtable');
const axios = require('axios')

Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY
});
var base = Airtable.base(process.env.AIRTABLE_BASE_ID);

/*** Zotero
 * Get Recently uploaded docs (could be by name? (ID?) could be by recent added/edited? vet the selections? search all and maintain status?)
 */
const getMostRecentAdded =
  async (amt) => {
    try {
      let url = "https://api.zotero.org/users/"+ process.env.ZOTERO_USER_ID + "/items"
      return await axios.get(url, {
          headers: {
              "Zotero-API-Key": process.env.ZOTERO_API_KEY,
          },
          params: {
              sort: "dateAdded",
              limit: amt,
              format: "json",
              direction: "desc"
          }
      })
    } catch (error) {
      console.error(error)
    }
  }

const getMostRecentUpdated = 
async (amt) => {
  try {
    let url = "https://api.zotero.org/users/"+ process.env.ZOTERO_USER_ID + "/items"
    return await axios.get(url, {
        headers: {
            "Zotero-API-Key": process.env.ZOTERO_API_KEY,
        },
        params: {
            sort: "dateUpdated",
            limit: {amt},
            format: "json",
            direction: "asc"
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
        "Authors": obj.data.authors,
        "Key": obj.key, // make ID
        "Type": obj.data.itemType
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
      "Authors": obj.data.authors,
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
        "text": obj.data.note,
        "Key": obj.key, // make ID
        "color": obj.data.tags, // REPLACE
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
      "Authors": obj.data.authors,
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

function parseAnnotations(note){
  tags = note.split("<p>")
  //ignore first set of tags up to first entry
  tags = tags.slice(1)
  // clean up content
  map = {"blue": [], "green": [], "yellow": []}
  for (i = 0; i < tags.length; i++){
    idx = tags[i].indexOf("background-color: ") + ("background-color: ".length) + 1 //for #
    color = tags[i].substring(idx, idx+8)
    idx += 9 //jump forward to >
    bodyIdx = tags[i].indexOf("“")
    bodyEndIdx = tags[i].indexOf("”")
    bodyText = tags[i].substring(bodyIdx+1, bodyEndIdx) // ignore weird quotation marks
    console.log(bodyText)
    console.log(color)
    if (color == "83ffed80") {
      map["blue"].push(bodyText)
    } else if (color == "00ff0080") {
      map["green"].push(bodyText)
    } else if (color == "ffff0080") {
      map["yellow"].push(bodyText)
    } 
  }
  return map
}

// Outputs

const outputCollection = async (amt) => {
  const collection = await getMostRecentAdded(amt)
    //console.log(parseAnnotations(collection.data[0].data.note))
    console.log(collection.data)
}
outputCollection("2")
