/*
A Google App Script that will take a sheet in a specific format and return iOS and Android localization files on Google Drive folder.

License: MIT
Author: Mehul Joisar [mehuljoisar@gmail.com]
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

// Configurable properties

/*
   The number of languages you support. Please check the README.md for more
   information on column positions.
*/
var NUMBER_OF_LANGUAGES = 3;

/* 
   The script expects two columns for iOS and Android identifiers, respectively,
   and a column after that with all of the string values. This is the position of
   the iOS column.
*/
var FIRST_COLUMN_POSITION = 1;

/*
   The position of the header containing the strings "Identifier iOS" and "Identifier Android"
*/
var HEADER_ROW_POSITION = 1;

/*
   True if iOS output should contain a `Localizable` `enum` that contains all of
   the keys as string constants.
*/
var IOS_INCLUDES_LOCALIZABLE_ENUM = true;


// Don't change following constants 

var LANGUAGE_IOS      = 'iOS';
var LANGUAGE_ANDROID  = 'Android';
var DEFAULT_LANGUAGE = LANGUAGE_IOS;

var RESOURCE_DIR  = 'res';
var STRINGS_FILE  = 'strings.xml';
var PREFIX_LANG_DIR  = 'values-';

var CONSTANTS_FILE_IOS  = 'Constants.swift';
var STRINGS_FILE_IOS  = 'Localizable.strings';
var POSTFIX_LANG_DIR_IOS  = '.lproj';

var REF_STRING  = '%s';
var REF_STRING1  = '%1$s';
var REF_STRING2  = '%2$s';
var REF_STRING3  = '%3$s';
var REF_INT  = '%d';
var REF_INT1  = '%1$d';
var REF_INT2  = '%2$d';
var REF_INT3  = '%3$d';
var REF_FLOAT  = '%f';
var REF_FLOAT1  = '%1$f';
var REF_FLOAT2  = '%2$f';
var REF_FLOAT3  = '%3$f';

var REF_STRING_IOS  = '%@';
var REF_INT_IOS  = '%d';
var REF_FLOAT_IOS  = '%f';

// Export

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Custom Export')
      .addItem('iOS', 'exportForIos')
      .addItem('Android', 'exportForAndroid')
      .addToUi();
}

function exportForIos() {
  var e = {
    parameter: {
      language: LANGUAGE_IOS
    }
  };
  exportSheet(e);
}

function exportForAndroid() {
  var e = {
    parameter: {
      language: LANGUAGE_ANDROID
    }
  };
  exportSheet(e);
}

/*
   Fetches the active sheet, gets all of the data and displays the
   result strings.
*/
function exportSheet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();
  var rowsData = getRowsData_(sheet, getExportOptions(e));
  
  var headersRange = sheet.getRange(1, 3, HEADER_ROW_POSITION, NUMBER_OF_LANGUAGES);
  var headers = normalizeHeaders(headersRange.getValues()[0]);  
  

    var thisFileId = SpreadsheetApp.getActive().getId();
    var thisFile = DriveApp.getFileById(thisFileId);
    var rootFolder = thisFile.getParents().next();

  if(getExportOptions(e).language==LANGUAGE_ANDROID) {
    var androidFolder = createFolder(rootFolder,LANGUAGE_ANDROID);
    var resourceFolder = createFolder(androidFolder,RESOURCE_DIR);
    
    for (var i = 0; i < NUMBER_OF_LANGUAGES; i++) {
    var languageFolder = createFolder(resourceFolder,PREFIX_LANG_DIR+headers[i]);
    var file = createOrUpdateFile(languageFolder,STRINGS_FILE,makeString(rowsData, i, getExportOptions(e)));
  }
    
  }
  else if(getExportOptions(e).language==LANGUAGE_IOS){
    var iOSFolder = createFolder(rootFolder,LANGUAGE_IOS);
    
    for (var i = 0; i < NUMBER_OF_LANGUAGES; i++) {
    var languageFolder = createFolder(iOSFolder,headers[i]+POSTFIX_LANG_DIR_IOS);
    var file = createOrUpdateFile(languageFolder,STRINGS_FILE_IOS,makeString(rowsData, i, getExportOptions(e)));
  }
    var file = createOrUpdateFile(iOSFolder,CONSTANTS_FILE_IOS,makeIosEnumString(rowsData, 0, getExportOptions(e)));
  }
  
  /*
    var strings = [];
  for (var i = 0; i < NUMBER_OF_LANGUAGES; i++) {
    strings.push(makeString(rowsData, i, getExportOptions(e)));
  }
  if(getExportOptions(e).language==LANGUAGE_IOS) {
    strings.push(makeIosEnumString(rowsData, 0, getExportOptions(e)));
  }

  return displayTexts_(strings);
  */
  
  
}

function createFolder(parentFolder,folderName){
  var folder = null;
  if(!parentFolder.getFoldersByName(folderName).hasNext()){
      folder = parentFolder.createFolder(folderName)
  }
  else{
      folder = parentFolder.getFoldersByName(folderName).next();
  }
  return folder;
}

function createOrUpdateFile(parentFolder,fileName,content){
  var file = null;
  if (!parentFolder.getFilesByName(fileName).hasNext()) {
    file = parentFolder.createFile(fileName, content);
  } else {
    file = parentFolder.getFilesByName(fileName).next();
    file.setContent(content);
  }
  return file;
}

function getExportOptions(e) {

  var options = {};
  options.language = e && e.parameter.language || DEFAULT_LANGUAGE;  
  return options;
}


// UI Elements

function makeLabel(app, text, id) {
  var lb = app.createLabel(text);
  if (id) lb.setId(id);
  return lb;
}

function makeListBox(app, name, items) {
  var listBox = app.createListBox().setId(name).setName(name);
  listBox.setVisibleItemCount(1);
  
  var cache = CacheService.getPublicCache();
  var selectedValue = cache.get(name);
  Logger.log(selectedValue);
  for (var i = 0; i < items.length; i++) {
    listBox.addItem(items[i]);
    if (items[1] == selectedValue) {
      listBox.setSelectedIndex(i);
    }
  }
  return listBox;
}

function makeButton(app, parent, name, callback) {
  var button = app.createButton(name);
  app.add(button);
  var handler = app.createServerClickHandler(callback).addCallbackElement(parent);;
  button.addClickHandler(handler);
  return button;
}

function makeTextBox(app, name) { 
  var textArea = app.createTextArea().setWidth('100%').setHeight('100px').setId(name).setName(name);
  return textArea;
}

function displayTexts_(texts) {
  
  var app = UiApp.createApplication().setTitle('Export');

  for (var i = 0; i < texts.length; i++) {
    app.add(makeTextBox(app, 'json' + i));
    app.getElementById('json' + i).setText(texts[i]); 
  }
  
  var ss = SpreadsheetApp.getActiveSpreadsheet(); 
  ss.show(app);

  return app; 
}


// Creating iOS and Android strings

function makeString(object, textIndex, options) {
  switch (options.language) {
    case LANGUAGE_ANDROID:
      return makeAndroidString(object, textIndex, options);
      break;
    case LANGUAGE_IOS:
      return makeIosString(object, textIndex, options);
      break;
    default:
      break;
  }
}

/*
   Creates the strings.xml file for Android.
*/
function makeAndroidString(object, textIndex, options) {

  var exportString = "";
  var prevIdentifier = "";
  
  exportString = '<?xml version="1.0" encoding="UTF-8"?>' + "\n";
  exportString += "<resources>\n";
  
  for(var i=0; i<object.length; i++) {
    
    var o = object[i];
    var identifier = o.identifierAndroid;
    
    var text = o.texts[textIndex];
    
    
    if (text == undefined || text == "") {
      exportString = exportString + "\n";
      continue;
    }
    
    if (identifier == "") {
        identifier = o.identifierIos;
        if(identifier == ""){
          continue;
        }
      }    

    if (identifier == undefined || identifier == "//") {
      exportString += "\n"+"\t" +"<!--"+" "+text+" "+"-->"+ "\n"+ "\n";
      continue;
    }
    
  
    if(identifier != prevIdentifier && prevIdentifier != "") {
      exportString += "\t" + '</string-array>' + "\n";
      prevIdentifier = "";
    }
    
    if(identifier.indexOf("[]")>0) {
      
      if(identifier != prevIdentifier) {
        exportString += "\t" + '<string-array name="' + identifier.substr(0,identifier.length-2) + '">' + "\n";
      }
      
      exportString += "\t\t"+'<item>'+o.text+'</item>' + "\n";
      prevIdentifier = identifier;
      
    } else {
      exportString += "\t"+'<string name="'+identifier+'">'+text+'</string>' + "\n";
    }
  }
  
  exportString += "</resources>";
  
  return exportString;
}
  
/*
   Creates the Localizable enum file 
*/
function makeIosEnumString(object, textIndex, options) {

  var exportString = "";
  
  if (IOS_INCLUDES_LOCALIZABLE_ENUM) {
  
    exportString += "// MARK: - Localizable enum\n\n"
  
    exportString += "enum Localizable {\n\n"
          
    for(var i=0; i<object.length; i++) {
        
      var o = object[i];
      var text = o.texts[textIndex];
    
      if (text == undefined || text == "") {
        continue;
      }
    
      var identifier = o.identifierIos;
      
      if (identifier == "") {
        identifier = o.identifierAndroid;
        if(identifier == ""){
          continue;
        }
      }
      
    text = text.replace(REF_STRING, REF_STRING_IOS);
    text = text.replace(REF_STRING1, REF_STRING_IOS);
    text = text.replace(REF_STRING2, REF_STRING_IOS);
    text = text.replace(REF_STRING3, REF_STRING_IOS);
    text = text.replace(REF_INT, REF_INT_IOS);
    text = text.replace(REF_INT1, REF_INT_IOS);
    text = text.replace(REF_INT2, REF_INT_IOS);
    text = text.replace(REF_INT3, REF_INT_IOS);
    text = text.replace(REF_FLOAT, REF_FLOAT_IOS);
    text = text.replace(REF_FLOAT1, REF_FLOAT_IOS);
    text = text.replace(REF_FLOAT2, REF_FLOAT_IOS);
    text = text.replace(REF_FLOAT3, REF_FLOAT_IOS);
      
      
      if (identifier == undefined || identifier == "//") {
      exportString += "\n"+"\n"+"\t" +identifier+" "+text+ "\n";
      continue;
    }      
        
      exportString += "\n"+"\t"+"static let " + identifier + " = \"" + identifier + "\"";
      
    }
    
    exportString += "}\n\n"
  }
    return exportString;
}  

/*
   Creates the Localizable.strings file.
*/
function makeIosString(object, textIndex, options) {

  var exportString = "";
  exportString += "// MARK: - Strings\n\n";
  
  for(var i=0; i<object.length; i++) {
    var o = object[i];
    var identifier = o.identifierIos;
    var text = o.texts[textIndex];
    
    if (text == undefined || text == "") {
      continue;
    }
    
      if (identifier == "") {
        identifier = o.identifierAndroid;
        if(identifier == ""){
          continue;
        }
      }
    
    
    text = text.replace(REF_STRING, REF_STRING_IOS);
    text = text.replace(REF_STRING1, REF_STRING_IOS);
    text = text.replace(REF_STRING2, REF_STRING_IOS);
    text = text.replace(REF_STRING3, REF_STRING_IOS);
    text = text.replace(REF_INT, REF_INT_IOS);
    text = text.replace(REF_INT1, REF_INT_IOS);
    text = text.replace(REF_INT2, REF_INT_IOS);
    text = text.replace(REF_INT3, REF_INT_IOS);
    text = text.replace(REF_FLOAT, REF_FLOAT_IOS);
    text = text.replace(REF_FLOAT1, REF_FLOAT_IOS);
    text = text.replace(REF_FLOAT2, REF_FLOAT_IOS);
    text = text.replace(REF_FLOAT3, REF_FLOAT_IOS);
    
    if (identifier == undefined || identifier == "//") {
      exportString += "\n" +identifier+" "+text+ "\n"+ "\n";
      continue;
    }    
    exportString += '"' + identifier + '" = "' + text + "\";\n";
  }
  
  return exportString;
}


// Data fetching

/*
   Gets the titles for the first row from the speadsheet, in lower case and without spaces.
   - returns: a string array of the headers
*/
function getNormalizedHeaders(sheet, options) {
  var headersRange = sheet.getRange(1, FIRST_COLUMN_POSITION, HEADER_ROW_POSITION, sheet.getMaxColumns());
  var headers = headersRange.getValues()[0];
  return normalizeHeaders(headers);
}

/*
   Removes all empty cells from the headers string array, and normalizes the rest into camelCase.
   - returns: a string array containing a list of normalized headers
*/
function normalizeHeaders(headers) {
  var keys = [];
  for (var i = 0; i < headers.length; ++i) {
    var key = normalizeHeader(headers[i]);
    if (key.length > 0) {
      keys.push(key);
    }
  }
  return keys;
}

/*
   Converts a header string into a camelCase string.
    - returns a string in camelCase
*/
function normalizeHeader(header) {
  var key = "";
  var upperCase = false;
  for (var i = 0; i < header.length; ++i) {
    var letter = header[i];
    if (letter == " " && key.length > 0) {
      upperCase = true;
      continue;
    }
    if (!isAlnum_(letter)) {
      continue;
    }
    if (key.length == 0 && isDigit_(letter)) {
      continue; // first character must be a letter
    }
    if (upperCase) {
      upperCase = false;
      key += letter.toUpperCase();
    } else {
      key += letter.toLowerCase();
    }
  }
  return key;
}

/*
   Gets all of the data from the sheet.
    - returns an array of objects containing all the necessary data for display.
*/
function getRowsData_(sheet, options) {
  
  var dataRange = sheet.getRange(HEADER_ROW_POSITION + 1, FIRST_COLUMN_POSITION, sheet.getMaxRows(), sheet.getMaxColumns());
  var headers = getNormalizedHeaders(sheet, options);
  var objects = getObjects(dataRange.getValues(), headers);
  
  return objects;
}

/*
   Gets the objects for the cell data. For each cell, the keys are the headers and the value is the
   data inside the cell.
   - returns: an array of objects with data for displaying the final string
*/
function getObjects(data, keys) {
  
  var objects = [];
  
  for (var i = 0; i < data.length; ++i) {
    
    var object = {
      "texts": []
    };
    
    var hasData = false;
    
    for (var j = 0; j < data[i].length; ++j) {
      
      var cellData = data[i][j];
      if (isCellEmpty_(cellData)) {
        cellData = "";
      }
      
      if (keys[j] != "identifierIos" && keys[j] != "identifierAndroid") {
        object["texts"].push(cellData);
      } else {
        object[keys[j]] = cellData;
      }
      hasData = true;
    }
    if (hasData) {
      objects.push(object);
    }
  }
  return objects;
}


// Utils

// Returns true if the cell where cellData was read from is empty.
// Arguments:
//   - cellData: string
function isCellEmpty_(cellData) {
  return typeof(cellData) == "string" && cellData == "";
}

// Returns true if the character char is alphabetical, false otherwise.
function isAlnum_(char) {
  return char >= 'A' && char <= 'Z' ||
    char >= 'a' && char <= 'z' ||
    isDigit_(char);
}

// Returns true if the character char is a digit, false otherwise.
function isDigit_(char) {
  return char >= '0' && char <= '9';
}

// Given a JavaScript 2d Array, this function returns the transposed table.
// Arguments:
//   - data: JavaScript 2d Array
// Returns a JavaScript 2d Array
// Example: arrayTranspose([[1,2,3],[4,5,6]]) returns [[1,4],[2,5],[3,6]].
function arrayTranspose_(data) {
  if (data.length == 0 || data[0].length == 0) {
    return null;
  }

  var ret = [];
  for (var i = 0; i < data[0].length; ++i) {
    ret.push([]);
  }

  for (var i = 0; i < data.length; ++i) {
    for (var j = 0; j < data[i].length; ++j) {
      ret[j][i] = data[i][j];
    }
  }

  return ret;
}
