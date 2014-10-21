define([
  "dojo/on",

  "esri/layers/ArcGISDynamicMapServiceLayer",

  "modules/makeCheck.js",
  "modules/info.js",
  "modules/spinner.js"
  ],
function(
  on,

  ArcGISDynamicMapServiceLayer,

  makeCheck,
  info,
  spinner
){
  //need to do something about legends

  //need to provide an array of zip files for active layers

  //need to rework the populate function such that only the proper things are added to the right pane
  //This will differ per layer type but is managed internally. The function is eventually called with
  //to set the title and content nodes (currently as innerHTML, but might make more sense as append)

  var activeUrls = {};
  var nameReg = /([^\/]*)\/MapServer/;

  var DOC = document;

  var queued = [];
  var busy = 0;
  var active = 0;

  function makeSpaced(name){
    return name.replace(/_/g," ")
  }

  function makeUnderscored(name){
    return name.replace(/ /g,"_")
  }


  return function(url, map, node, populate, downloader, paramFilter){

    populate.noLayers = 0;

    var active = 0;
    if(!busy){
      active = 1;
      busy = 1;
    }

    var serviceName;
    var serviceDescription;

    var services = [];
    var layerNames = [];

    var firstService = makeService(url,services);

    info.register(url);

    function processLayer(e){
      var layer = e.layer;
      var layerInfos = layer.layerInfos;

      console.log(layer,layerInfos)

      serviceName = makeSpaced(url.match(nameReg)[1]);
      serviceDescription = layer.description;

      var container = DOC.createElement('div');
      var title = DOC.createElement('h3');
      title.innerText = serviceName;
      container.appendChild(title);

      if(paramFilter){
        paramFilter(url,services,container);
      }else{
        /*One map layer for each service layer, for independent transparencies*/
        for(var i=0; i<layerInfos.length; i++){
          if(i>0) makeService(url,services);
          buildCheck(layerInfos[i],i,container,services);
        }

        for(i=0; i<services.length; i++){
          map.addLayer(services[i],1);
        }
      }
      console.log(layerNames);
      node.appendChild(container);

      populate(serviceName,serviceDescription);

      //preserve ordering
      var next = queued.shift();
      if(next) next();
      else busy = 0;
    }


    function buildCheck(layerInfo, i, container){
      services[i].setVisibleLayers([i]);
      layerNames[i] = makeUnderscored(layerInfo.name);
      var check = makeCheck(layerInfo, i, container, services);
      on(check,"change",function(){
        toggleLayer(i,services);
        if(!services[i].suspended)spinner(check,services[i]);
      })
    }


    firstService.on("load",function(e){
      if(!busy||active) processLayer(e);
      else queued.push(function(){processLayer(e)});
    });

  }


    function makeService(url,services){
      var service = new ArcGISDynamicMapServiceLayer(url);
      service.suspend();
      services.push(service);
      return service;
    }

//todo add legend

    function toggleLayer(id,services){
      var service = services[id];
      if(service.suspended){
        service.resume();
        info.activate(service.url,id);
        //downloader.add
      }else{
        service.suspend();
        info.deactivate(service.url,id);
      }
    }



  /*  return {
      service:service,
      getDownloads:getDownloads
    }*/

});