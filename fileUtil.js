var path = require('path')
var fs = require('fs')

module.exports = {
	getFilesForDescriptions: getFilesForDescriptions
};

function getFilesForDescriptions(startPath, filter){
	var ret = {};
	var files = findFilesInDir(startPath,filter);
	files.forEach(findDescriptionInFile);
	
	function findDescriptionInFile(item, index) {
		try {  
			var fileText = fs.readFileSync(item, 'utf8');
			var position = 0;
			while (position !== -1){
				position = fileText.indexOf("describe(");
				if(position !== -1){
					var delimeter = fileText[position + 9];
					var descriptionEnd = fileText.indexOf(delimeter, position + 10) + 1;
					var description = fileText.substring(position + 10, descriptionEnd - 1);
					ret[description] = item;
					position = 0;
					fileText = fileText.substring(descriptionEnd);
				}
			}
		} catch(e) {
			console.log('Error:', e.stack);
		}	
	}
	
	return ret;
}

function findFilesInDir(startPath,filter){

    var results = [];

    if (!fs.existsSync(startPath)){
        console.log("no dir ",startPath);
        return;
    }

    var files=fs.readdirSync(startPath);
    for(var i=0;i<files.length;i++){
        var filename=path.join(startPath,files[i]);
        var stat = fs.lstatSync(filename);
        if (stat.isDirectory()){
            results = results.concat(findFilesInDir(filename,filter)); //recurse
        }
        else if (filename.indexOf(filter)>=0) {
            console.log('-- found: ',filename);
            results.push(filename);
        }
    }
    return results;
}