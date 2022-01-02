function getURLParameter(paramName) {
    let result = "";
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
    return result.replace(/\%20/g, " ");;
}

function today() {
    let now = new Date();
    let ed = easyDate(now);
    return `${ed.year}-${ed.month}-${ed.day}`; 
}

function easyDate(dateTime) {
    let year = dateTime.getFullYear();
    let month = ('0' + (dateTime.getMonth() + 1)).substr(-2);
    let day = ('0' + dateTime.getDate()).substr(-2);
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
