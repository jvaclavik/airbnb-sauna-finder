const fetch = require("node-fetch");

const headers = {
  accept: "application/json",
  "accept-encoding": "br, gzip, deflate",
  "content-type": "application/json",
  "x-airbnb-api-key": "915pw2pnf4h1aiguhph5gc5b2",
  "x-airbnb-currency": "CZK",
  "x-airbnb-locale": "en",
  "x-airbnb-carrier-country": "us",
  "accept-language": "en-us"
};
const params = {
  query: "Norway, Lyngen",
  adults: "6",
  toddlers: "0",
  infants: "0",
  is_guided_search: "true",
  version: "1.4.8",
  section_offset: "0",
  items_offset: "0",
  screen_size: "small",
  source: "explore_tabs",
  items_per_grid: "500",
  _format: "for_explore_search_native",
  metadata_only: "false",
  "refinement_paths[]": "/homes",
  timezone: "Europe/Prague",
  satori_version: "1.1.0"
};

const paramString = Object.keys(params)
  .map(key => `${key}=${encodeURIComponent(params[key])}`)
  .join("&");
const fetchHome = id => {
  const request = fetch(
    `https://api.airbnb.com/v2/pdp_listing_details/${id}?_format=for_native`,
    {
      method: "get",
      headers: headers
    }
  )
    .then(body =>
      body.json().catch(e => {
        // console.log(`Not a JSON response (ID: ${id})`);
      })
    )
    .then(body => {
      if (body) {
        const descriptionObject = body.pdp_listing_detail.sectioned_description;
        const searchedInFields = [
          "space",
          "summary",
          "notes",
          "name",
          "access"
        ];

        const isSaunaAvailable =
          searchedInFields
            .map(field => descriptionObject[field])
            .join(" ")
            .indexOf("saun") !== -1;

        if (isSaunaAvailable) {
          console.log(`- https://www.airbnb.cz/rooms/${id}`);
        }
      }
    })
    .catch(e => {
      console.log(e);
    });
  return request;
};

const filterAsync = (array, filter) =>
  Promise.all(array.map(entry => filter(entry))).then(bits =>
    array.filter(entry => bits.shift())
  );

fetch(`https://api.airbnb.com/v2/explore_tabs?${paramString}`, {
  method: "get",
  headers: headers
})
  .then(body => body.json().catch(e => null))
  .then(body => {
    if (body) {
      const ids = body.explore_tabs[0].home_tab_metadata.remarketing_ids;
      console.log(
        `Saunas ${params.query} (search in ${
          ids.length
        } results)\n============================`
      );
      const saunasUrls = filterAsync(ids, fetchHome);
    }
  })
  .catch(e => {
    console.log(e);
  });
