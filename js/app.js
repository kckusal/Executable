/**STANDARD COMPONENTS
 * Terminologies:
 *    key:  unique identifier for that component, port, link
 *    name: name of the component/port that will appear in the diagram
 *    ins:  an array of port objects regarded as input for a component
 *    outs: an array of port objects regarded as output of a component
 *    loc:  coordinates of the location of a component
 *
 */

function Subtract() {
    console.log(sub.outs[0].data);
    sub.outs[0].data = sub.ins[0].data - sub.ins[1].data;
    save();
    load();
}

var add = {
    "name": "ADD",
    "ins":[
        { "name": "i1"},
        { "name": "i2"}
    ],
    "outs":[
        { "name": "Sum" }
    ],
    execute: function() {
      this.outs[0].value = this.ins[0].value + this.ins[1].value;
    }
};

var sub = {
  "name": "SUB",
  "ins": [
      { "name": "i1"},
      { "name": "i2"}
  ],
  "outs": [
      { "name": "Diff" }
  ]
};

var mult = {
    "name": "MULT",
    "ins": [
        { "name": "i1"},
        { "name": "i2"}
    ],
    "outs": [
        { "name": "Prod" }
    ]
};

var div = {
    "name": "DIV",
    "ins": [
        { "name": "i1"},
        { "name": "i2"}
    ],
    "outs": [
        { "name": "Out" }
    ]
};

var replace = {
    "name": "REPLACE",
    "ins": [
        { "name": "s1"},
        { "name": "s2"},
        { "name": "s3"}
    ],
    "outs": [
        { "name": "Out" }
    ]
};

var isSubstring = {
    "name": "isSubstring",
    "ins": [
        { "name": "s1"},
        { "name": "s2"}
    ],
    "outs": [
        { "name": "Out" }
    ]
};

var concatenate = {
    "name": "CONCATENATE",
    "ins": [
        { "name": "s1"},
        { "name": "s2"}
    ],
    "outs": [
        { "name": "Out" }
    ]
};

function addComponent(component) {
  var savedText = document.getElementById("mySavedModel");
  var nodes = JSON.parse(savedText.value);

  if (component.custom === true && component.component == undefined) {
      var name = prompt("Enter the name for your new component.");
      if (name == "") {
        alert("Field info required to proceed. Try again!");
        return;
      }
      var n = {
          "name": name,
          "ins": [],
          "outs": [],
          "loc": "0 0"
      };

      var inputs = parseInt(prompt("How many input ports will this component have?"));
      if (name == "") {
        alert("Field info required to proceed. Try again!");
        return;
      }
      var inp_name, inp;
      for (var i = 0; i < inputs; i++) {
          inp_name = prompt("Enter name of input port " + (i + 1) + ":");
          if (name == "") {
            alert("Field info required to proceed. Try again!");
          return;
          }
          inp = {
              "name": inp_name
          };
          n.ins.push(inp);
      }

      var out_name = prompt("Enter name of output port:");
      if (name == "") {
        alert("Field info required to proceed. Try again!");
        return;
      }
      var out = {
          "name": out_name
      }
      n.outs.push(out);
      nodes.nodeDataArray.push(n);
  } else {
    switch (component.component) {
        case "add":
            nodes.nodeDataArray.push(add);
            break;
        case "sub":
            nodes.nodeDataArray.push(sub);
            break;
        case "mult":
            nodes.nodeDataArray.push(mult);
            break;
        case "div":
            nodes.nodeDataArray.push(div);
            break;
        case "replace":
            nodes.nodeDataArray.push(replace);
            break;
        case "isSubstring":
            nodes.nodeDataArray.push(isSubstring);
            break;
        case "concatenate":
            nodes.nodeDataArray.push(concatenate);
            break;
    }
  }

  savedText.value = JSON.stringify(nodes);
  load();
  save();
}

// returns name and value of the selected part
function getSelectedObject(part) {
  let targetName, targetValue;
  targetName = document.getElementById("selected-name");
  targetValue = document.getElementById("selected-value");
  document.getElementById("selected-key").value = part.key;

  var x = JSON.stringify(part);
  //alert(x);

  targetName.disabled = false;
  targetName.value = part.name;

  // input nodes have "_in" property true; output nodes have false
  // components do not have this property, so distinguish thereby

  // if undefined, this is a whole component, not a node.
  if (part["_in"] === undefined) {
    targetValue.value = "Not applicable."
    targetValue.disabled = true;
  } else {
    // this is a node
    targetValue.disabled = false;
    
    // this is an input node
    if (part["_in"] === true) {
      // for input ports, binding a value should only be allowed if it does
      // NOT receive any value from any other port
      if (portComesFrom(part)) {
        targetValue.value = "";
        targetValue.disabled = true;
        targetValue.placeholder = "Port already receiving value.";
      } else {
        if (part.value == undefined) {
          targetValue.value = "";
          targetValue.placeholder = "Bind a value to this port.";
        } else {
          targetValue.value = part.value;
        }
      }
    } else {
      // this is an output node, so shouldn't be allowed to bind values
      targetValue.value = "";
      targetValue.disabled = true;
      targetValue.placeholder = "Auto bound at run-time."
    }
  }
  document.getElementById("btnUpdateProperties").disabled = false;
}

function clearPropertiesFields() {
  let w,x,y;
  w = document.getElementById("selected-key");
  x = document.getElementById("selected-name");
  y = document.getElementById("selected-value");
  w.value = x.value = y.value = "";
  x.placeholder = y.placeholder = "";
  x.disabled = y.disabled = true;
  document.getElementById("btnUpdateProperties").disabled = true;
}


// a function to return the input port to which an output port leads to
function portLeadsTo(port) {
  if (port["_in"] === true) {
    // since this is not an output port, return by alerting;
    alert("This is an input port. It is used for execution and does NOT lead to any other port.");
    return;
  }
  var savedText = document.getElementById("mySavedModel");
  var linkDataArray = JSON.parse(savedText.value).linkDataArray;

  for (let i=0; i<linkDataArray.length; i++) {
    if (linkDataArray[i].from === port.key) {
      return linkDataArray[i].to;
    }
  }
}

// a function to return the output port from which an input port gets its value
function portComesFrom(port) {
  if (port["_in"] === false) {
    // since this is not an output port, return by alerting;
    alert("This is an output port. It saves the result of execution and does NOT come from any other port in particular.");
    return;
  }
  var savedText = document.getElementById("mySavedModel");
  var linkDataArray = JSON.parse(savedText.value).linkDataArray;

  for (let i=0; i<linkDataArray.length; i++) {
    if (linkDataArray[i]["to"] === port["_g"] && linkDataArray[i]["toPort"] === port["name"]) {
      return linkDataArray[i]["from"];
    }
  }

}


// update properties: name/value of the nodes and components
// if not node, its a whole component.
// 
function updateProperties() {
  let key = document.getElementById("selected-key").value;
  let name = document.getElementById("selected-name").value;
  let value = document.getElementById("selected-value").value;

  var savedText = document.getElementById("mySavedModel");
  var model = JSON.parse(savedText.value);
  
  for (let i=0; i<model.nodeDataArray.length; i++) {
    //alert(model.nodeDataArray[i]["key"]);
    if (model.nodeDataArray[i]["key"] == key) {
      if (name !== "") model.nodeDataArray[i]["name"] = name;
      if (value !== "") model.nodeDataArray[i]["value"] = value;
      break;
    }

    for (let j=0; j<model.nodeDataArray[i]["ins"].length; j++) {
      //alert(model.nodeDataArray[i]["ins"][j]["key"]);
      if (model.nodeDataArray[i]["ins"][j]["key"] == key) {
        if (name !== "") model.nodeDataArray[i]["ins"][j]["name"] = name;
        if (value !== "") model.nodeDataArray[i]["ins"][j]["value"] = value;
        break;
      }
    }
    
    for (let j=0; j<model.nodeDataArray[i]["outs"].length; j++) {
      if (model.nodeDataArray[i]["outs"][j]["key"] == key) {
        if (name !== "") model.nodeDataArray[i]["outs"][j]["name"] = name;
        break;
      }
    }
    
  }

  alert(JSON.stringify(model));
  savedText.value = JSON.stringify(model);
  load();
  save();
  clearPropertiesFields();
}


/**
  * Predefined functions that execute when a component is called in.
  */
function add(x, y) { return x+y; }
function sub(x, y) { return x-y; }
function mult(x, y) { return x*y; }
function div(x, y) { return x/y; }


// binds the components by theri id to a predefined function
var functionForComponent = {

};

/**
  * Execute the components with available inputs.
  * Highlight components that are successfully executed with green outline.
  * Highlight components that cannot be executed with red outline.
  */
function executeAll() {
  var model = myDiagram.model;
  alert(JSON.stringify(model));

  // Step 1: Find out which components have all direct inputs
  // Step 2: Run those components and get the output.
  // Step 3: Find components whose input depends on the previous output.
  // Step 4: Set components in step 3's inputs from output of step 2.

}


// Maps the connections between components by their id
var connectionMap = {};

function isInArray(arr,obj) {
    return (arr.indexOf(obj) != -1);
}

function loadConnectionMap() {
  let target = document.getElementById("connection-map");
  let source = JSON.parse(document.getElementById("mySavedModel").value).linkDataArray;

  for(let i=0; i<source.length; i++) {
    if (connectionMap[source[i]["from"]] === undefined) {
      connectionMap[source[i]["from"]] = [];
      connectionMap[source[i]["from"]].push(source[i]["to"]);
    } else {
      if (!isInArray(connectionMap[source[i]["from"]], source[i]["to"])) {
        connectionMap[source[i]["from"]].push(source[i]["to"]);
      }
    }
  }


  target.innerHTML = JSON.stringify(connectionMap, null, 4);
}

