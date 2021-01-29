const BASE_URL = "http://127.0.0.1:8080";

window.monitor = {
  info,
  error,
  debug,
  warn,
  asyncCatch,
};

function notFound(errInfo, classPath) {
  const content = {
    tagName: errInfo.target.tagName,
    timeStamp: errInfo.timeStamp,
    src: errInfo.target.href,
    location: window.location.href,
    classPath,
  };

  return {
    errType: "notFound",
    content,
  };
}

function runtime(errInfo) {
  const {colno, lineno, error} = errInfo;
  if (!error) return;
  const location = window.location.href;
  const content = {
    colno,
    lineno,
    // filename,
    stack: error.stack,
    location,
  };
  return {
    errType: "runtime",
    content,
  };
}

function getErrorContext(errInfo) {
  if ("IMG" === errInfo.target.tagName) {
    // 获取图片的页面布局路径
    const classPath = errInfo.path.reduce((acc, cur) => {
      return acc + (cur.className || "") + "=>";
    }, "");
    return notFound(errInfo, classPath);
  }
  if (["LINK", "SCRIPT"].includes(errInfo.target.tagName)) {
    return notFound(errInfo);
  }
  return runtime(errInfo);
}

function autoSend(error) {
  const payload = {
    logLevel: "error", // debug，error，info，warn,
    trigger: "auto", // auto，manual
    ...getErrorContext(error),
  };
  sendMsg(btoa(JSON.stringify(payload)));
}

function sendMsg(params) {
  const url = BASE_URL + "/monitor/error?info=" + params;
  new Image().src = url;
}

function info(content, errType) {
  commomManual("info", content, errType);
}
function error(content, errType) {
  commomManual("error", content, errType);
}
function debug(content, errType) {
  commomManual("debug", content, errType);
}
function warn(content, errType) {
  commomManual("warn", content, errType);
}
function asyncCatch(res) {
  const {
    statusText,
    status,
    request: {responseURL},
    config,
    headers,
    data,
  } = res;
  const content = {
    statusText,
    status,
    responseURL,
    req: {
      data: config.data,
      headers: config.headers,
    },
    res: {
      data,
      headers,
    },
  };
  commomManual("error", content, "asyncCatch");
}

// TODO 为了传更多参数，改为post
function commomManual(logLevel, content, errType = "unknown") {
  const payload = {
    errType,
    content,
    logLevel, // debug，error，info，warn,
    trigger: "manual",
  };
  const params = btoa(JSON.stringify(payload));
  const url = BASE_URL + "/monitor/error?info=" + params;
  ajax({url});
}

function ajax(payload) {
  const {url, data, method = "get"} = payload;
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if (xhr.status == 200) {
        try {
          // 只支持json
          const ret = JSON.parse(xhr.responseText);
          console.log("ret", ret);
          // onSuccess(file, ret);
        } catch (err) {
          // onError(file, err);
        }
      } else {
        // onError(file, new Error('XMLHttpRequest response status is ' + xhr.status));
      }
    }
  };
  xhr.open(method, url);
  xhr.send(data);
}

window.addEventListener("unhandledrejection", e => {
  throw e.reason;
  // throw e;
});
window.addEventListener(
  "error",
  e => {
    autoSend(e);
    console.log("error", e);
  },
  true // 第二个参数为true,处于捕获阶段触发
);
