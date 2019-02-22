var doc = app.activeDocument;
doc.suspendHistory('Live2D Mini Preprocess', 'exec()');

function buildName(name, prefix) {
  builder = [];
  if (prefix && prefix.length > 0) builder.push(prefix);
  // NOTE: Cubism may fail to load if layer has contains dot
  builder.push(name.replace(/\./g, '-').replace(/(^\s+)|(\s+$)/g, ''));
  return builder.join('-');
}

function seq(a) {
  var r = [];
  for (var c = 0; c < a.length; c++)
    r.push(a[c]);
  r.each = function(m) {
    for (var c = 0; c < this.length; c++)
      m(this[c]); 
  };
  r.reversed_each = function(m) {
    for (var c = this.length - 1; c >= 0; c--)
      m(this[c]);
  }
  return r;
} 

function handleArtLayers(layers, prefix) {
  // NOTE: grouped = clipping masked
  groupedLayers = seq([]);
  seq(layers).each(function(layer) {
    if (!layer.visible || /^#/.test(layer.name)) {
      layer.remove();
      return;
    }
    if (layer.isBackgroundLayer)
      return;
    if (layer.grouped) {
      groupedLayers.push(layer);
      return
    }
    set = doc.layerSets.add();
    set.name = layer.name;
    set.move(layer, ElementPlacement.PLACEBEFORE);
    layer.move(set, ElementPlacement.INSIDE);
    placeTarget = layer;
    groupedLayers.reversed_each(function(l) {
      l.move(placeTarget, ElementPlacement.PLACEBEFORE);
      l.grouped = true;
      placeTarget = l;
    });
    groupedLayers = seq([]);
    layer.name = buildName(layer.name, prefix);
    set.merge(); 
  });
}

function handleLayerSets(sets, prefix) {
  seq(sets).each(function(set) {
    if (!set.visible || /^#/.test(set.name) || !(set.artLayers.length + set.layerSets.length))  {
      set.remove();
      return;
    }
    prefixer = /^(.+?)(-\*)$/.exec(set.name);
    if (prefixer) set.name = prefixer[1]; 
    if (/^@/.exec(set.name)) {
      set.name = buildName(set.name.substr(1), prefix);
      set.merge();
      return;
    }
    handleArtLayers(set.artLayers, prefixer ? buildName(prefixer[1], prefix) : prefix);
    if (set.layerSets.length > 0) {
      handleLayerSets(set.layerSets, prefixer ? buildName(prefixer[1], prefix) : prefix);
      return;
    }
    set.name = buildName(set.name, prefix);
    set.merge();
  });
}

function exec() {
  handleArtLayers(doc.artLayers);
  handleLayerSets(doc.layerSets);
}
