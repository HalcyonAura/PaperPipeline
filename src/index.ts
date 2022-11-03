import { resolve } from "path"
import { config } from "dotenv"
config({ path: resolve(__dirname, "../.env") })

import Airtable, { FieldSet } from 'airtable';
import axios, { AxiosRequestConfig, AxiosPromise, AxiosResponse } from 'axios';
import { AirtableBase } from 'airtable/lib/airtable_base';
Airtable.configure({
  endpointUrl: 'https://api.airtable.com',
  apiKey: process.env.AIRTABLE_API_KEY
});
const base: AirtableBase = Airtable.base(process.env.AIRTABLE_BASE_ID as string);

const zoteroKey = process.env.ZOTERO_API_KEY as string
const zoteroUser = "https://api.zotero.org/users/"+ process.env.ZOTERO_USER_ID

/** 
 * Interfaces
 */
interface Creator {
  lastName: string,
  firstName: string
}

interface ZoteroRecord {
  key: string,
  data: {
    title: string,
    creators: Creator[],
    itemType: string,
    dateAdded: Date,
    dateModified: Date,
    note: string,
    tags: string[],
    parentItem: string
  }
}

interface Quote {
  quote: string,
  page: number
}

interface Annotations {
  Blue: Quote[],
  Green: Quote[],
  Yellow: Quote[]
}

/**
 * Processing
 */ 
/**
 * 
 * @param {array of authors of entry} creators 
 * @returns string of authors separated by ;
 */
 const parseCreators = (creators: Creator[]): string => {
  let creatorsString: string = ""
  if (creators.length != 0)
    creatorsString = creators[0].lastName + ", " + creators[0].firstName
  
  for (let j = 1; j < creators.length; j++){
    creatorsString+= "; " +creators[j].lastName + ", " + creators[j].firstName
  }
  return creatorsString
} // TODO: adjust this function for eventual authors table and organizing by unique authors

/**
 * 
 * @param note 
 * @returns map of annotations
 */
const parseAnnotations = (note: string): Annotations => {
  //ignore first set of HTML tags up to first <p>
  let tags: string[] = note.split("<p>").slice(1)
  // clean up content
  let map: Annotations = {
      Blue: [],
      Green: [],
      Yellow: []
    };
  for (let i = 0; i < tags.length; i++){
    // Get highlight color
    let idx = tags[i].indexOf("background-color: ") + ("background-color: ".length) + 1 // for #
    let color = tags[i].substring(idx, idx+8)
    idx += 9 //jump forward to end of span color
    let quoteIdx = tags[i].indexOf("“", idx)
    let QuoteEndIdx = tags[i].indexOf("”", idx)
    let quoteText:string = tags[i].substring(quoteIdx+1, QuoteEndIdx) // ignore alternate quotation marks
    idx = QuoteEndIdx
    let pageIdx = tags[i].indexOf("p. ", idx)
    let pageEndIdx = tags[i].indexOf("</span", pageIdx)
    let page = +tags[i].substring(pageIdx + "p. ".length, pageEndIdx)
    console.log(quoteText)
    console.log(color)
    console.log(page)
    if (color == "83ffed80") {
    map["Blue"].push({quote: quoteText, page: page})
    } else if (color == "00ff0080") {
    map["Green"].push({quote: quoteText, page: page})
    } else if (color == "ffff0080") {
    map["Yellow"].push({quote: quoteText, page: page})
    } 
  }
  return map
}

const createRefField = (data: ZoteroRecord) => {
  return  {"fields": {
    "Key": data.key,
    "Title": data.data.title,
    "Authors": parseCreators(data.data.creators),
    "Type": data.data.itemType,
  }}
} // TODO return interface

const createQuoteField = (key: string, parentKey: string, color: string, quote: string, page: number) => {
  return  { "fields": {
    "Key": key,
    "Quote": quote,
    "Color": color,
    "Page": page
  }}
} // TODO return interface, add parents

/*** Zotero
 * Get recently uploaded or modified entries or children of entries
 */

/**
 * 
 * @param {number of entries to query} amt 
 */
 const getMostRecentPapersUpdated = 
  (amt: number): Promise<AxiosResponse<any, any>> => {
  try {
    let url = zoteroUser + "/items/top"
    return axios.get(url, {
      headers: {
          "Zotero-API-Key": zoteroKey,
      },
      params: {
          sort: "dateModified",
          limit: amt,
          format: "json",
          direction: "desc"
      }
    })
  } catch (error) {
    throw error
  }
 }

  /**
 * 
 * @param {number of entries to query} amt 
 */
const getMostRecentPapersAdded = 
(amt: number): Promise<AxiosResponse<any, any>> => {
  try {
    let url = zoteroUser + "/items/top"
    return axios.get(url, {
      headers: {
          "Zotero-API-Key": zoteroKey,
      },
      params: {
          sort: "dateAdded",
          limit: amt,
          format: "json",
          direction: "desc"
      }
    })
  } catch (error) {
    throw error
  }
}

/**
 * 
 * @param key Zotero record
 * @returns record's children
 */
const getItem = (key: string): Promise<AxiosResponse<any, any>> => {
  try {
    let url = zoteroUser + "/items/" + key + "/children"
    return axios.get(url, {
        headers: {
            "Zotero-API-Key": zoteroKey,
        },
        params: {
            format: "json"
        }
    })
  } catch (error) {
    throw error
  }
}

/*** Airtable
 * Write/update Zotero records to papers or quotes table(s)
 */

/**
* 
* @param data 
* @returns 
*/
const putReferences = async (data: ZoteroRecord[]) => {
  try {
    let fields: any = [] // TODO figure this type out
    for (let i = 0; i < data.length; i++){
      fields.push(createRefField(data[i]))
    }
    // Max 10 objects per create records
    const promises = [];
    for (let i = 0; i < fields.length; i += 10){
      promises.push(base('References').create(fields.slice(i*10, (i*10)+10)));
    }
    await Promise.all(promises);
  } catch (error) {
    throw error
  }
}

/**
* 
* @param data 
* @returns 
*/
 const putQuotes = async (data: ZoteroRecord) => {
  try {
    let fields: any = [] // TODO figure this type out
    // Don't process non-notes for quotes
    if (data.data.itemType != 'note') {
      return false
    }
    let mapQuotes: Annotations = parseAnnotations(data.data.note);
    Object.entries(mapQuotes).forEach(entry => {
      const [color, quotes] = entry;
      for (let j = 0; j < quotes.length; j++){
        fields.push(
          createQuoteField(data.key, data.data.parentItem, color, quotes[j].quote, quotes[j].page))
      }
    });
    // Max 10 objects per create records
    const promises = [];
    for (let i = 0; i < fields.length; i += 10){
      promises.push(base('Quotes').create(fields.slice(i*10, (i*10)+10)));
    }
    await Promise.all(promises);
    return true
  } catch (error) {
    throw error
  }
}

/**
* 
* @param data 
* @returns 
*/
const updateReferences = async (data: ZoteroRecord[]) => {
  try {
    let fields: any = [] // TODO figure this type out
    for (let i = 0; i < data.length; i++){
      fields.push(createRefField(data[i]))
    }
    // Max 10 objects per create records
    const promises = [];
    for (let i = 0; i < fields.length; i += 10){
      promises.push(base('References').create(fields.slice(i*10, (i*10)+10)));
    }
    await Promise.all(promises);
  } catch (error) {
    console.error(error)
  }
}

/**
* 
* @param data 
* @returns 
*/
const updateQuotes = async (data: ZoteroRecord) => {
  try {
    let fields: any = [] // TODO figure this type out
    // Don't process non-notes for quotes
    if (data.data.itemType != 'note') {
      return false
    }
    let mapQuotes: Annotations = parseAnnotations(data.data.note);
    Object.entries(mapQuotes).forEach(entry => {
      const [color, quotes] = entry;
      for (let j = 0; j < quotes.length; j++){
        fields.push(
          createQuoteField(data.key, data.data.parentItem, color, quotes[j].quote, quotes[j].page))
      }
    });

    // Max 10 objects per create records
    const promises = [];
    for (let i = 0; i < fields.length; i += 10){
      promises.push(base('Quotes').create(fields.slice(i*10, (i*10)+10)));
    }
    await Promise.all(promises);

    return true
  } catch (error) {
    throw error
  }
}

/**
 * Entry functions
 */

/**
 * 
 * @param amt 
 */
const recentlyAdded = async (amt: number) => {
  try {
    let response = await getMostRecentPapersAdded(amt);
    putReferences(response.data)
    for(let item of response.data) {
      let children = await getItem(item.key)
      if (children) {
        for (let c of children.data){
          putQuotes(c)
        }
      }
    }
  } catch (error) {
    throw error
  }
}

const recentlyUpdated = async (amt: number) => {
  try {
    let response = await getMostRecentPapersUpdated(amt);
    // Check if updated paper exists in table yet it no then put
    // needs to be sorted into what needs to be created and what doesn't
    updateReferences(response.data)
    if (response.data[0].key){
      updateReferences(response.data[0].data)
    } else {
      putReferences(response.data[0].data)
    }
    for(let item of response.data) {
      let children = await getItem(item.key)
      if (children){
        for (let c of children.data){
          // check if exists in table yet, if no then put
          if (c.data.key){
            updateQuotes(c)
          } else {
            putQuotes(c)
          }
        }
      }
    }
  } catch (error) {
    throw error
  }
}

recentlyAdded(2)
recentlyUpdated(2)

// Use cases

/*
1. get most recent top level papers (updated)
2. get children
3. call updatereferences and put quotes

1. get most recent top level papers (added)
2. get children
3. call putreferences and put quotes if notes available

1. get most recent items
2. if item is note find parent to update parent and call put quotes
2a. if item is note call update quotes
3. if item is ref call put ref and get children to call put quotes
*/