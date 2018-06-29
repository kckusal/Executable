function init() {
  let setInitComponent = {
    "class": "go.GraphLinksModel",
    "linkFromPortIdProperty": "fromPort",
    "linkToPortIdProperty": "toPort",
    "nodeDataArray": [
    {"key":1, "name":"Example", "ins":[ {"name":"s1", "key":-3},{"name":"s2", "key":-4} ], "outs":[ {"name":"o1", "key":-5} ], "loc":"-80 -80"}],
    "linkDataArray": []
  };

  if (localStorage.getItem("AppModel") === null) {
    localStorage.setItem("AppModel", JSON.stringify(setInitComponent));
  }
  
  //if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
  var $ = go.GraphObject.make;

  myDiagram =
    $(go.Diagram, "myDiagramDiv",
      {
    initialContentAlignment: go.Spot.Center,
    "undoManager.isEnabled": true,
    // don't allow links within a group
    "linkingTool.linkValidation": differentGroups,
    "relinkingTool.linkValidation": differentGroups,
    mouseDrop: function(e) {
      // when the selection is dropped in the diagram's background,
      // and it includes any "port"s, cancel the drop
      if (myDiagram.selection.any(selectionIncludesPorts)) {
        myDiagram.currentTool.doCancel();
      }
    }
  });

  function differentGroups(fromnode, fromport, tonode, toport) {
    return fromnode.containingGroup !== tonode.containingGroup;
  }

  function selectionIncludesPorts(n) {
    return n.containingGroup !== null && !myDiagram.selection.contains(n.containingGroup);
  }

  var UnselectedBrush = "lightgray";  // item appearance, if not "selected"
  var SelectedBrush = "dodgerblue";   // item appearance, if "selected"

  myDiagram.nodeTemplate =
    $(go.Node, "Auto",
      { selectionAdorned: false },
      {
    mouseDrop: function(e, n) {
      // when the selection is entirely ports and is dropped onto a Group, transfer membership
      if (n.containingGroup !== null && myDiagram.selection.all(selectionIncludesPorts)) {
        myDiagram.selection.each(function(p) { p.containingGroup = n.containingGroup; });
      } else {
        myDiagram.currentTool.doCancel();
      }
    }
  },
      $(go.Shape,
        {
    name: "SHAPE",
    fill: UnselectedBrush, stroke: "gray",
    geometryString: "F1 m 0,0 l 5,0 1,4 -1,4 -5,0 1,-4 -1,-4 z",
    spot1: new go.Spot(0, 0, 5, 1),  // keep the text inside the shape
    spot2: new go.Spot(1, 1, -5, 0),
    // some port-related properties
    portId: "",
    toSpot: go.Spot.Left,
    toLinkable: false,
    fromSpot: go.Spot.Right,
    fromLinkable: false,
    cursor: "pointer"
  },
        new go.Binding("fill", "isSelected", function(s) { return s ? SelectedBrush : UnselectedBrush; }).ofObject(),
        new go.Binding("toLinkable", "_in"),
        new go.Binding("fromLinkable", "_in", function(b) { return !b; })),
      $(go.TextBlock,
        new go.Binding("text", "name"))
     );

  myDiagram.groupTemplate =
    $(go.Group, "Auto",
      {
    selectionAdorned: false,
    locationSpot: go.Spot.Center, locationObjectName: "ICON"
  },
      new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
      {
    mouseDrop: function(e, g) {
      // when the selection is entirely ports and is dropped onto a Group, transfer membership
      if (myDiagram.selection.all(selectionIncludesPorts)) {
        myDiagram.selection.each(function(p) { p.containingGroup = g; });
      } else {
        myDiagram.currentTool.doCancel();
      }
    },
    layout: new InputOutputGroupLayout()
  },
      $(go.Shape, "RoundedRectangle",
        { stroke: "gray", strokeWidth: 2, fill: "transparent" },
        new go.Binding("stroke", "isSelected", function(b) { return b ? SelectedBrush : UnselectedBrush; }).ofObject()),
      $(go.Panel, "Vertical",
        { margin: 6 },
        $(go.TextBlock,
          new go.Binding("text", "name"),
          { alignment: go.Spot.Left, margin: 4 }),
        $(go.Panel, "Spot",
          { name: "ICON", height: 60 },  // an initial height; size will be set by InputOutputGroupLayout
          $(go.Shape,
            { fill: null, stroke: null, stretch: go.GraphObject.Fill }),
          $(go.Picture, "images/60x90.png",
            { width: 30, height: 45 })
         )
       )
     );

  myDiagram.linkTemplate =
    $(go.Link,
      { routing: go.Link.AvoidsNodes, curve: go.Link.JumpGap, corner: 10, toShortLength: -3 },
      { relinkableFrom: true, relinkableTo: true },
      $(go.Shape, { stroke: "gray", strokeWidth: 2.5 })
     );

    // when the document is modified, add a "*" to the title and enable the "Save" button
    myDiagram.addDiagramListener("Modified", function(e) {
        loadConnectionMap();
        var button = document.getElementById("saveButton");
        if (button) button.disabled = !myDiagram.isModified;
        var idx = document.title.indexOf("*");
        if (myDiagram.isModified) {
            if (idx < 0) document.title = "*" + document.title;
        } else {
            if (idx >= 0) document.title = document.title.substr(idx+1, document.title.length);
        }
    });

    // when the node/component is single-clicked, trigger the function inside.
    myDiagram.addDiagramListener("ObjectSingleClicked",
      function(e) {
        var part = e.subject.part;
        if (!(part instanceof go.Link)) getSelectedObject(part.data);
        
      });

    // when the selection has changed in the diagram
    myDiagram.addDiagramListener("BackgroundSingleClicked",
      function() {
        clearPropertiesFields();
      });

  loadInitial();  // initialize myDiagram's model from the TextArea
}


function findPortNode(g, name, input) {
  for (var it = g.memberParts; it.next(); ) {
    var n = it.value;
    if (!(n instanceof go.Node)) continue;
    if (n.data.name === name && n.data._in === input) return n;
  }
  return null;
}

// Transform the given data to the data structures needed internally.
// For each data object in the "ins" Array of the node data, add a "port" Node to the Group.
// For each data object in the "outs" Array, add a "port" Node to the Group.
// For each link data, convert the "from" and "fromPort" information to the actual "port" Node,
// and then the same for "to" and "toPort".
// The internal model uses property names starting with "_" to avoid having Model.toJson() write them out.
function setupDiagram(nodes, links) {
  var model = new go.GraphLinksModel();
  model.linkFromKeyProperty = "_f";
  model.linkToKeyProperty = "_t";
  model.nodeIsGroupProperty = "_isg";
  model.nodeGroupKeyProperty = "_g";

  // first create all of the nodes, implemented as Groups
  for (var i = 0; i < nodes.length; i++) {
    var nodedata = nodes[i];
    nodedata._isg = true;
  }
  model.addNodeDataCollection(nodes);
  // now each node data will have a unique key, if not already specified

  // then create all of the ports, implemented as Nodes that are members of those Groups
  for (var i = 0; i < nodes.length; i++) {
    var nodedata = nodes[i];
    if (Array.isArray(nodedata.ins)) {
      for (var j = 0; j < nodedata.ins.length; j++) {
        var portdata = nodedata.ins[j];
        portdata._in = true;
        portdata._g = nodedata.key;
      }
      model.addNodeDataCollection(nodedata.ins);
      nodedata.ins = undefined;
    }
    if (Array.isArray(nodedata.outs)) {
      for (var j = 0; j < nodedata.outs.length; j++) {
        var portdata = nodedata.outs[j];
        portdata._in = false;
        portdata._g = nodedata.key;
      }
      model.addNodeDataCollection(nodedata.outs);
      nodedata.outs = undefined;
    }
  }

  myDiagram.model = model;
  // now Groups and Nodes exist, so can find the Node corresponding to a node's port

  // finally process all of the links, to account for ports actually being member nodes
  for (var i = 0; i < links.length; i++) {
    var linkdata = links[i];
    var fromNode = myDiagram.findNodeForKey(linkdata.from);
    var toNode = myDiagram.findNodeForKey(linkdata.to);
    if (fromNode !== null && toNode !== null) {
      // look in the Group for a "port" Node with the right name and directionality
      var fromPortNode = findPortNode(fromNode, linkdata.fromPort, false);
      var toPortNode = findPortNode(toNode, linkdata.toPort, true);
      if (fromPortNode !== null && toPortNode !== null) {
        linkdata._f = fromPortNode.data.key;
        linkdata._t = toPortNode.data.key;
        linkdata.from = linkdata.fromPort = linkdata.to = linkdata.toPort = undefined;
      }
    }
  }
  model.addLinkDataCollection(links);
}

function save() {
  // can't just call myDiagram.model.toJson() -- need to transform to external format
  var m = new go.GraphLinksModel();
  m.linkFromPortIdProperty = "fromPort";
  m.linkToPortIdProperty = "toPort";
  var arr = myDiagram.model.nodeDataArray;
  myDiagram.nodes.each(function(g) {
    if (g instanceof go.Group) {
      g.data.ins = undefined;
      g.data.outs = undefined;
      m.addNodeData(g.data);
    }
  });
  myDiagram.nodes.each(function(n) {
    if (!(n instanceof go.Group)) {
      var gd = n.containingGroup.data;
      var a = n.data._in ? gd.ins : gd.outs;
      if (!a) {
        a = [];
        if (n.data._in) gd.ins = a; else gd.outs = a;
      }
      a.push(n.data);
    }
  });
  myDiagram.links.each(function(l) {
    l.data.from = l.fromNode.containingGroup.data.key;
    l.data.fromPort = l.fromNode.data.name;
    l.data.to = l.toNode.containingGroup.data.key;
    l.data.toPort = l.toNode.data.name;
    m.addLinkData(l.data);
  });
  document.getElementById("mySavedModel").value = JSON.stringify(JSON.parse(m.toJson()), null, 4);

  // save to local web storage
  localStorage.setItem("AppModel", document.getElementById("mySavedModel").value);

  myDiagram.isModified = false;

}

// Loads diagram by taking data from the saved textarea.
function load() {
  var m = go.Model.fromJson(document.getElementById("mySavedModel").value);
  setupDiagram(m.nodeDataArray, m.linkDataArray);
}

// Loads diagram by taking data from the local storage
function loadInitial() {
  var initialDiagramData = localStorage.getItem("AppModel");

  var m = go.Model.fromJson(initialDiagramData);
  setupDiagram(m.nodeDataArray, m.linkDataArray);

  document.getElementById("mySavedModel").value = JSON.stringify(JSON.parse(initialDiagramData), null, 4);
}


// The Group.layout, for arranging the "port" Nodes within the Group
function InputOutputGroupLayout() {
  go.Layout.call(this);
}
go.Diagram.inherit(InputOutputGroupLayout, go.Layout);

InputOutputGroupLayout.prototype.doLayout = function(coll) {
  coll = this.collectParts(coll);

  var portSpacing = 2;
  var iconAreaWidth = 60;

  // compute the counts and areas of the inputs and the outputs
  var left = 0;
  var leftwidth = 0;  // max
  var leftheight = 0; // total
  var right = 0;
  var rightwidth = 0;  // max
  var rightheight = 0; // total
  coll.each(function(n) {
    if (n instanceof go.Link) return;  // ignore Links
    if (n.data._in) {
      left++;
      leftwidth = Math.max(leftwidth, n.actualBounds.width);
      leftheight += n.actualBounds.height;
    } else {
      right++;
      rightwidth = Math.max(rightwidth, n.actualBounds.width);
      rightheight += n.actualBounds.height;
    }
  });
  if (left > 0) leftheight += portSpacing * (left-1);
  if (right > 0) rightheight += portSpacing * (right-1);

  var loc = new go.Point(0, 0);
  if (this.group !== null && this.group.location.isReal()) loc = this.group.location;

  // first lay out the left side, the inputs
  var y = loc.y - leftheight/2;
  coll.each(function(n) {
    if (n instanceof go.Link) return;  // ignore Links
    if (!n.data._in) return;  // ignore outputs
    n.position = new go.Point(loc.x - iconAreaWidth/2 - leftwidth, y);
    y += n.actualBounds.height + portSpacing;
  });

  // now the right side, the outputs
  y = loc.y - rightheight/2;
  coll.each(function(n) {
    if (n instanceof go.Link) return;  // ignore Links
    if (n.data._in) return;  // ignore inputs
    n.position = new go.Point(loc.x + iconAreaWidth/2 + rightwidth - n.actualBounds.width, y);
    y += n.actualBounds.height + portSpacing;
  });

  // then position the group and size its icon area
  if (this.group !== null) {
    // position the group so that its ICON is in the middle, between the "ports"
    this.group.location = loc;
    // size the ICON so that it's wide enough to overlap the "ports" and tall enough to hold all of the "ports"
    var icon = this.group.findObject("ICON");
    if (icon !== null) icon.desiredSize = new go.Size(iconAreaWidth+leftwidth/2+rightwidth/2, Math.max(leftheight, rightheight) + 10);
  }
};
