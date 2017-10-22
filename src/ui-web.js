/* eslint-disable */
/* globals NSUUID NSThread NSPanel NSMakeRect NSTexturedBackgroundWindowMask NSTitledWindowMask NSWindowTitleHidden NSClosableWindowMask NSColor NSWindowMiniaturizeButton NSWindowZoomButton NSFloatingWindowLevel WebView COScript */
import MochaJSDelegate from 'mocha-js-delegate';

const coScript = COScript.currentCOScript();

function parseQuery(query) {
  query = query.split('?')[1]
  if (!query) { return }
  query = query.split('&').reduce(function (prev, s) {
    var res = s.split('=')
    if (res.length === 2) {
      prev[decodeURIComponent(res[0])] = decodeURIComponent(res[1])
    }
    return prev
  }, {})
  return query
}


function updateContext() {
    const doc = NSDocumentController.sharedDocumentController().currentDocument();

    return {
        document: doc
    }
}

function WebUI(context, handleStateChange) {
  const doc = updateContext().document;

  const userDefaults = NSUserDefaults.standardUserDefaults();

  const title = 'sketch-graphql';
  const identifier = 'com.sketch-graphql.webviewtemplate';
  const threadDictionary = NSThread.mainThread().threadDictionary();

  if (threadDictionary[identifier]) {
    return;
  }

  const windowWidth = 600;
  const windowHeight = 550;
  const webViewWindow = NSPanel.alloc().init();
  webViewWindow.setFrame_display(
    NSMakeRect(0, 0, windowWidth, windowHeight),
    true,
  );
  webViewWindow.setStyleMask(
    NSTexturedBackgroundWindowMask |
      NSTitledWindowMask |
      NSClosableWindowMask |
      NSResizableWindowMask,
  );

  webViewWindow.setBackgroundColor(NSColor.whiteColor());
  webViewWindow.standardWindowButton(NSWindowMiniaturizeButton).setHidden(true);
  webViewWindow.standardWindowButton(NSWindowZoomButton).setHidden(true);
  webViewWindow.setTitle(title);
  webViewWindow.setTitlebarAppearsTransparent(true);
  webViewWindow.becomeKeyWindow();
  webViewWindow.setLevel(NSFloatingWindowLevel);
  threadDictionary[identifier] = webViewWindow;
  COScript.currentCOScript().setShouldKeepAround_(true);

  const webView = WebView.alloc().initWithFrame(
    NSMakeRect(0, 0, windowWidth, windowHeight - 24),
  );
  webView.setAutoresizingMask(NSViewWidthSizable | NSViewHeightSizable);
  const windowObject = webView.windowScriptObject();
  const delegate = new MochaJSDelegate({

    'webView:didChangeLocationWithinPageForFrame:': function(
      webView,
      webFrame,
    ) {
      const locationHash = windowObject.evaluateWebScript('window.location.hash');
      const query = parseQuery(locationHash);
      log(query);
      handleStateChange(query);
    },
  });

  webView.setFrameLoadDelegate_(delegate.getClassInstance());
  webView.setMainFrameURL_(
    context.plugin.urlForResourceNamed('index.html').path(),
  );
  webViewWindow.contentView().addSubview(webView);
  webViewWindow.center();
  webViewWindow.makeKeyAndOrderFront(nil);

  const closeButton = webViewWindow.standardWindowButton(NSWindowCloseButton);
  closeButton.setCOSJSTargetFunction(function(sender) {
    COScript.currentCOScript().setShouldKeepAround(false);
    threadDictionary.removeObjectForKey(identifier);
    webViewWindow.close();
  });
  closeButton.setAction('callAction:');
}

export default WebUI;
