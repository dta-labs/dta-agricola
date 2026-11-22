function getURLParameter(paramName) {
    let result;
    let urlParam = window.location.href.split('?');
    if (urlParam[1]) {
        urlParam = urlParam[1].replace("%40", "@");
        let urlParamArray = urlParam.split('&');
        urlParamArray.forEach(param => {
            let paramArray = param.split('=');
            if (paramArray[0] == paramName) {
                result = paramArray[1];
            }
        });
    }
    return result;
}

function importJS(url) {
    var script = document.createElement('script');
    var parentScript = document.getElementById('myscript');
    parentScript = parentScript.src;
    parentScript = parentScript.split('/');
    parentScript.pop();
    parentScript = parentScript.join();
    parentScript = parentScript.replace(/,/gi, '/');
    script.src = parentScript + url;
    let body = document.body;
    body.appendChild(script);
}

function convertDashToDot(input) {
    return input.replace(/\-/g, ".");
}

function convertDotToDash(input) {
    return input.replace(/\./g, "-");
}

function transformItem(input) {
    let result = '';
    if (input) {
        result = input.toLowerCase();
        result = result.replace(/\á/g, "a");
        result = result.replace(/\à/g, "a");
        result = result.replace(/\ä/g, "a");
        result = result.replace(/\â/g, "a");
        result = result.replace(/\é/g, "e");
        result = result.replace(/\è/g, "e");
        result = result.replace(/\ë/g, "e");
        result = result.replace(/\ê/g, "e");
        result = result.replace(/\í/g, "i");
        result = result.replace(/\ì/g, "i");
        result = result.replace(/\ï/g, "i");
        result = result.replace(/\î/g, "i");
        result = result.replace(/\ó/g, "o");
        result = result.replace(/\ò/g, "o");
        result = result.replace(/\Ö/g, "o");
        result = result.replace(/\ô/g, "o");
        result = result.replace(/\ú/g, "u");
        result = result.replace(/\ù/g, "u");
        result = result.replace(/\ü/g, "u");
        result = result.replace(/\û/g, "u");
        result = result.replace(/\ñ/g, "n");
    }
    return result;
}

function easyDate(_dateTime) {
	let dateTime = new Date(_dateTime.replace(/\-0/g, "-"));
	let year = dateTime.getFullYear();
	let month = ('0' + (dateTime.getMonth() + 1)).substr(-2);
	let day = ('0' + (dateTime.getDate() > 9 ? dateTime.getDate() + 1 : dateTime.getDate())).substr(-2);
	let dayOfWeek = dateTime.getDay();
	let hour = ('0' + dateTime.getHours()).substr(-2);
	let min = ('0' + dateTime.getMinutes()).substr(-2);
	return {
		year: year,
		month: month,
		day: day,
		dayOfWeek: dayOfWeek,
		date: year + '-' + month + '-' + day,
		hour: hour,
		min: min,
		time: hour + ':' + min,
		timeStamp: dateTime.getTime()
	}
}

function sortBy(list, param) {
    list.sort(function (a, b) {
        var x = a[param];
        var y = b[param];
        return (x < y) ? 1 : (x > y) ? -1 : 0;
    });
}

