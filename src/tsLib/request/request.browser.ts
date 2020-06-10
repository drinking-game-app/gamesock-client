const fetch= (method:'GET'|'POST', url:string, body:object,  callback:(err:any, res:any, status:any)=>void, timeout:number)=> {
  try {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = ()=> {
      if (xhr.readyState === 4) {
        const contentType = xhr.getResponseHeader('Content-Type');
        if (contentType && contentType.indexOf('json') !== -1) {
          try {
            // return JSON object
            const response = JSON.parse(xhr.responseText);
            callback(null, response, xhr.status);
          } catch (err) {
            callback(err, null, xhr.status);
          }
        }
        else {
          // return text
          callback(null, xhr.responseText, xhr.status);
        }
      }
    };

    xhr.ontimeout =  (err)=> {
      callback(err, null, 0);
    };

    xhr.open(method, url, true);
    xhr.timeout = timeout;

    if (typeof body === 'string') {
      xhr.send(body);
    }
    else if (body) { // body is an object
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify(body));
    }
    else {
      xhr.send();
    }
  }
  catch (err) {
    callback(err, null, 0);
  }
}

export const post =(url:string, body:object, timeout:number)=> {

  return new Promise<[any,any]>((resolve, reject) => {
    const callback =  (err:any, res:any, status:any)=> {
      if (err) {
        return reject(err);
      }

      resolve([res, status]);
    };

    fetch('POST', url, body,  callback, timeout)
  });
}
