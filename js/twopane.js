
// Include modules That you want to use in your application. The first argument is an array of
// strings identifying the modules to be included and the second argument is a function that gets
// its arguments populated by the return value of each module. Order matters.
require([
  "esri/map",
  "esri/geometry/Extent",
  "esri/SpatialReference",

  "dijit/registry",

  "esri/dijit/BasemapToggle",
  "esri/dijit/HomeButton",
  "esri/dijit/Scalebar",

  "esri/geometry/Point",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",

  "esri/graphic",
  "esri/geometry/webMercatorUtils",

  "dojo/on",
  "dojo/dom",
  "dojo/dom-class",
  "dojo/query",
  "dojo/_base/Color",
  "dojo/ready",

  "modules/geocode.js",
  "modules/info.js",

  "modules/layers/checks.js",

  "require"
  ], 

function(
  Map,
  Extent,
  SpatialReference,

  registry,

  BasemapToggle,
  HomeButton,
  Scalebar,

  Point,
  MarkerSymbol,
  LineSymbol,

  Graphic,
  wmUtils,

  on,
  dom,
  domClass,
  query,
  Color,
  ready,

  geocode,
  info,

  CheckLayer,

  require
  ){

  //Disable CORS detection, since services.arcgisonline.com is not CORS enabled
  esri.config.defaults.io.corsDetection = false;


  // Fires when the DOM is ready and all dependencies are resolved. Usually needed when using dijits.
  ready(function() {
    var W = window;
    var DOC = document;

    var server = DOC.location.hostname;
    server = server === "localhost" ? "gis.water.ca.gov" : server;

    var serverFolder = server.slice(0,3) === "gis" ? "Public" : "cadre";
    var prefix = "https://"+server+"/arcgis/rest/services/" + serverFolder 
    var suffix = "/MapServer";


    var mapPane = dom.byId("centerPane");
    var serviceNode = dom.byId("serviceNode");
    var rightPane = dom.byId('rightPane');
    var titleNode = dom.byId('titleNode');
    var dataNode = dom.byId('dataNode');
    var closeButton = dom.byId('closeRP');

    var closeToggle;
    var home;

    var oldIE =(DOC.all&&!W.atob)?true:false;



    var staticServices = {};
    var servicesById = {};

    var serviceDescriptions = {};
    

    if(oldIE) fx = require("dojo/_base/fx", function(fx){return fx});


    // Choose your initial extent. The easiest way to find this is to pan around the map, checking the
    // current extent with 'map.extent' in the Javascript console (F12 to open it)
    var initialExtent = new Extent({
	    "xmin" : -13300000,
      "ymin" : 3500000,
      "xmax" : -12800000,
      "ymax" : 5500000, 
	    "spatialReference":{
        "wkid" : 102100
      }
    });

	



    // Create the map. The first argument is either an HTML element (usually a div) or, as in this case,
    // the id of an HTML element as a string. See https://developers.arcgis.com/en/javascript/jsapi/map-amd.html#map1
    // for the full list of options that can be passed in the second argument.
  	var map = new Map(mapPane, {
        basemap : "topo",
  	    extent:initialExtent,
        minZoom:6,
  	    maxZoom:12
      });


    //save the map to a global variable, useful for app development
    window.map = map;


    


    map.on("load", function(){
      map.disableDoubleClickZoom();

      var basemapToggle = BasemapToggle();
      on(dom.byId("basemapNode"),"mousedown",basemapToggle);

      info.init(map);
    });


    CheckLayer("https://darcgis.water.ca.gov/arcgis/rest/services/GGI/GIC_Boundaries/MapServer",serviceNode,map,populateRightPane);



    //initialize and hook up geocoder
    (function(){

      var symbol = new MarkerSymbol(
        MarkerSymbol.STYLE_CIRCLE
        , 10
        , new LineSymbol(LineSymbol.STYLE_SOLID, new Color("#44474d"), 1)
        , new Color("#041222")
        );
      var lastGraphic = null;


      var wrapper = DOC.createElement('div');
      var geocoder = DOC.createElement('input');


      wrapper.className = 'geocoderWrapper';
      geocoder.className = 'geocoder';
      geocoder.autofocus = 'autofocus';

      wrapper.appendChild(geocoder);
      mapPane.appendChild(wrapper);

      geocoder.tabIndex = "1";

      on(geocoder,"keyup",function(e){
        if(e.keyCode === 13){
          clearLastGeocode();
          geocode(geocoder.value,parseGeocoder)
        }
      });


      function parseGeocoder(data){
        var dataObj = JSON.parse(data);
        var topResult = dataObj.results[0];
        if(topResult){
          var location = topResult.geometry.location;
          var address = topResult.formatted_address;

          reflectLocationChoice(address)
          showLocation(location)
        }
      }


      function reflectLocationChoice(address){
        return geocoder.value = address;
      }


      function showLocation(location){
        var loc = wmUtils.lngLatToXY(location.lng,location.lat);
        var pnt = new Point(loc, new SpatialReference(102100));

        lastGraphic = new Graphic(pnt,symbol)

        map.graphics.add(lastGraphic);
        map.centerAndZoom(pnt,12);
      }


      function clearLastGeocode(){
        if(lastGraphic){
          map.graphics.remove(lastGraphic);
          lastGraphic = null;
        }
      }

    })();





    // Add dijits to the application



    //custom basemap toggle
    function BasemapToggle(){
      var t = "topo";
      var s = "satellite";
      var g = "gray";
      var src = "http://js.arcgis.com/3.10/js/esri/dijit/images/basemaps/"
      var basemapNode = DOC.createElement('div');
      var basemapPic = DOC.createElement('img');
      var labelWrapper = DOC.createElement('div');
      var basemapLabel = DOC.createElement('span');

      basemapNode.id = "basemapNode";

      labelWrapper.appendChild(basemapLabel)
      basemapNode.appendChild(basemapPic);
      basemapNode.appendChild(labelWrapper);

      centerPane.appendChild(basemapNode);
      setBasemap(t,s);

      function setBasemap(bmap,next){
        basemapPic.src = src + next + ".jpg";
        basemapLabel.textContent = next[0].toUpperCase() + next.slice(1);
        if(map.getBasemap()===bmap) return;
        map.setBasemap(bmap);
      }

      return function(){
        var current = map.getBasemap();
        current === t
        ? setBasemap(s,g)
        : current === s
          ? setBasemap(g,t)
          : setBasemap(t,s)
        ;
      }
    }




    //Home extent button
    home = new HomeButton({
      map: map
    }, "homeButton");

    home.startup();


    //toggling right pane
    closeToggle = function(){
      var showing = 0;
      var arro = dom.byId("arro");
      var movers = query(".mov");

      function arrowRight(){
        arro.style.marginLeft = "0px";
        arro.textContent = "\u25B6";
      }

      function arrowLeft(){
        arro.style.marginLeft = "-23px";
        arro.textContent = "\u25C0";
      }

      function showPane(){
        var i = 0, j = movers.length;
        showing = 1;
        
        setTimeout(arrowRight,100)

        if(oldIE){
          for(;i<j;i++){
            if(movers[i] === rightPane)
              fx.animateProperty({node:movers[i], duration:300, properties:{marginRight:0}}).play();
            else fx.animateProperty({node:movers[i], duration:300, properties:{marginRight:285}}).play();
          }
        }else{
          for(;i<j;i++)
            domClass.add(movers[i],"movd");
        }
      }



      function hidePane(){
        var i = 0, j = movers.length;
        showing = 0;

        setTimeout(arrowLeft,100)

        if(oldIE){
          for(;i<j;i++){
          if(movers[i] === rightPane)
            fx.animateProperty({node:movers[i], duration:250, properties:{marginRight:-285}}).play();
          else fx.animateProperty({node:movers[i], duration:250, properties:{marginRight:0}}).play();
          }
        }else{
          for(;i<j;i++)
            domClass.remove(movers[i],"movd");
        }
      }

      return function(){
        if(showing) hidePane();
        else showPane();
      }
    }();






    function resetDataHeight (){
      dataNode.style.height = DOC.documentElement.offsetHeight - 134 + "px"
    }







    resetDataHeight();
    on(W,"resize",resetDataHeight);
    on(closeButton,"mousedown", closeToggle);
    populateRightPane("","Read information about selected layers here")
    dom.byId("mainContainer").style.visibility="visible";

    W.setTimeout(function(){
      on.emit(closeButton, "mousedown",{bubbles:true,cancelable:true})
    },300);



    //This needs to be repurposed to pull in the download module.. then step through
    //visible layers and ask them to provide download links, then hand these in a flattened array
    //to the download module
    on(dom.byId("downloadLink"),"click",downloadZips)
    function downloadZips(){
      makeDownloads(getDataZips())
    }

    //Provide to the layers to add to the right pane
    function populateRightPane(title,data){
      titleNode.innerHTML = title;
      dataNode.innerHTML = data;
    }

  });
});