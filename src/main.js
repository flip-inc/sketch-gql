import _ from 'lodash';
import ApolloClient, { createNetworkInterface } from 'apollo-client';
import gql from 'graphql-tag';
import WebUI from './ui-web';
import queryParse from 'query-parse';

let globalApi;

function get(url) {
  log(url);
  var request = NSURLRequest.requestWithURL(NSURL.URLWithString(url));
  var data = NSURLConnection.sendSynchronousRequest_returningResponse_error(
    request,
    null,
    null,
  );
  if (data) {
    return data;
  } else {
    globalApi
      .currentDocument()
      .showMessage('Error in fetching data. Try again');
  }
}

const TEST_QUERY = `query RootQuery {
  listings {
    edges {
      node {
        headline
        rentInDollars
        locationString
        primaryPhoto {
          url
        }
      }
    }
  }
}`;

const client = new ApolloClient({
  networkInterface: createNetworkInterface({
    uri: 'https://api.flip.lease/graphql',
  }),
});

function setImage(layer, fill, imageData) {
  fill.setFillType(4);

  if (MSApplicationMetadata.metadata().appVersion < 47) {
    fill.setImage(
      MSImageData.alloc().initWithImage_convertColorSpace(imageData, false),
    );
  } else {
    fill.setImage(MSImageData.alloc().initWithImage(imageData));
  }
  fill.setPatternFillType(1);
}

function parseLayer(layer, data) {
  const str = new String(layer.name);
  const queriedData = _.get(data, str, false);
  if (layer.isGroup) {
    if (_.isArray(queriedData)) {
      let i = 0;
      layer.iterate(subLayer => {
        parseLayer(subLayer, queriedData[`${i}`]);
        i = i + 1;
      });
    } else if (queriedData) {
      layer.iterate(subLayer => parseLayer(subLayer, queriedData));      
    } else {
      layer.iterate(subLayer => parseLayer(subLayer, data)); 
    }
  } else if (layer.isText && !_.isObject(queriedData) && queriedData) {
    layer.text = `${queriedData}`;
  } else if (layer.isShape && _.isString(queriedData) && queriedData) {
    const fill = layer.sketchObject
      .style()
      .fills()
      .firstObject();
    const response = get(queriedData);
    const imageData = NSImage.alloc().initWithData(response);
    setImage(layer, fill, imageData);
  }
}

function parseQuery(query) {
  log('parsing query');
  client
    .query({
      query: gql`${query}`,
    })
    .then(({ data }) => {
      log('API success');
      globalApi.selectedDocument.selectedPage.selectedLayers.iterate(layer =>
        parseLayer(layer, data),
      );
    })
    .catch(error => log(error));
}

function handleStateChange(state) {
  log("here");
  log(state);
}

export default function(context) {
  const sketch = context.api();

  globalApi = sketch;
  WebUI(context, handleStateChange);
}
