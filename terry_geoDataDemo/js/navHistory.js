var unsortedNavSet = new Set();
var navList = [];

// expand the node and set it to be current node
// or just set it to be current if it's already expanded
function expandHelper(cy, node) {
    const cityName = node.json().data.label.split("\nboltz")[0];
    if(!node.hasClass('readyToCollapse')) {
        if(conceptExpansionDataCache.hasOwnProperty(node.id())) {
            addConceptNode(cy, node.id(), conceptExpansionDataCache[node.id()]);
        } else {
            const url = propertyQuery(cityName, true);
            d3.json(url).then(function(data) {var jsonData = getDataJSON(data); if(jsonData == undefined) return; addConceptNode(cy, node.id(), jsonData[0]);});
        }
        cy.$("#" + node.id()).addClass('readyToCollapse');
    } else {
      setAsCurrentNode(cy, node.id());
    }
}

// add a link "locatedInAdministrativeRegion" and target node with label = label
// connecting to prevNode
function addNodeHelper(cy, label, prevNode) {
    var addedData = [];
    var key = "locatedInAdministrativeRegion";
    var value = label;
    var tempNode = {"data":{}};
    // tempNode.data.type = "County"; ? 
    tempNode.group = "nodes";
    tempNode.data.label = value;
    tempNode.data.class = classifyclass(key, value);
    tempNode.data.id = convertToNodeID(prevNode.id(), key, value);
    tempNode.data.sourceID = prevNode.id();
    if(tempNode.data.class == "concept") {
        if(!conceptNodeLabelToID.hasOwnProperty(value)) {
            conceptNodeLabelToID[value] = tempNode.data.id;
        } else {
            tempNode.data.class = "dummyConcept";
        }
    }
    const radius = 400; 
    const sourceX = cy.$("#" + prevNode.id()).position('x');
    const sourceY = cy.$("#" + prevNode.id()).position('y');
    tempNode.position = {x:sourceX + radius, y:sourceY - radius};
    addedData.push(tempNode);
    var tempEdge = {"data":{}}
    tempEdge.group = "edges";
    tempEdge.data.id = convertToEdgeID(prevNode.id(), key, value)
    tempEdge.data.label = key;
    tempEdge.data.source = prevNode.id();
    tempEdge.data.target = tempNode.data.id;
    addedData.push(tempEdge);

    cy.add(addedData);
    reLayoutCola(cy);
    return cy.$("#"+tempNode.data.id)
}

function navigateTo(cy, name) {
    var node = searchConceptByLabel(cy, name);
    if(node !== undefined) {
        expandHelper(cy, node);
        return;
    }
    navigateThrough(cy, name);
}

function navigateThrough(cy, name) {
    var currNode = searchConceptByLabel(cy, navList[0]);
    // follow the link "locatedInAdministrativeRegion" to the last node
    while(true) {
        //outgoers include both edges and nodes
        var outgoers = currNode.outgoers();
        for(let i = 0; i < outgoers.length; i++) {
            var outgoer = outgoers[i];
            if(outgoer.json().group === "edges" && outgoer.json().data.label === "locatedInAdministrativeRegion") {
                currNode = outgoer.target();
                continue;
            }
        }
        break;
    }
    var start = 0;
    var end = 0;
    for(let i = 0; i < navList.length; i++) {
        if(navList[i] === currNode.json().data.label) {
            start = i + 1;
            continue;
        } 
        if(navList[i] === name) {
            end = i + 1;
            break;
        }
    }

    // follow thel link "locatedInAdministrativeRegion" from the curr node 
    // add new link and nodes until the node with label = name is added
    for(let i = start; i < end; i++) {
        var label = navList[i];
        currNode = addNodeHelper(cy, label, currNode);
    }
    expandHelper(cy, currNode);
}

// append nav history buttons in div whose id = nav-history
// according to the navList
function setNavHistory(cy) {
    $('.nav-history-button').remove();
    var reversedNavList = navList.slice().reverse();
    for(let i = 0; i < reversedNavList.length; i++) {
      var name = reversedNavList[i];
      var btn1 = $(`<button class="nav-button nav-history-button" value = "${i}">${name.split("\nboltz")[0]} ◀</button>`);
      if(i === reversedNavList.length - 1) {
        btn1 = $(`<button class="nav-button nav-history-button selected" value = "${i}">${name.split("\nboltz")[0]}</button>`);
      }
      $("#nav-history").append(btn1);
      (function(btn1, name) {
        btn1.on('click', function(e) {
          //highlight the selected button
          $('.nav-button.selected').removeClass('selected');
          $('.nav-button').filter(function() {
            var currText = $(this).text();
              // important: the name check for nav history and 
              // nav tools are hard coded here
              // if the name for them changed, here should be changed
              return  currText === name || currText === (name + " ◀");
          }).addClass("selected");
          //create rolling effect for show nav buttons
          var btn2 = $('.show-nav-button').filter(function() {
            return $(this).text() === name;
          });
          $('.show-nav-button').addClass('hidden');
          var btn2Val = parseInt(btn2.val());
          $('.show-nav-button[value="' + btn2Val.toString() + '"]').removeClass('hidden');
          if(btn2Val - 1 >= 0) {
            $('.show-nav-button[value="' + (btn2Val - 1).toString() + '"]').removeClass('hidden');
          }
          //navList length hsould be length of btn2, use another array!
          if(btn2Val + 1 < navList.length) {
            $('.show-nav-button[value="' + (btn2Val + 1).toString() + '"]').removeClass('hidden');
          }
          //navigate nodes
          try { 
            navigateTo(cy, name);
          } catch (e) {
            console.error(e);
          }
        });
      })(btn1, name);
    }
 }

// append nav tools buttons in div whose id = show-nav
function setNavButtons(cy) {
    $('.show-nav-button').remove();
    var reversedNavList = navList.slice().reverse();
    for(let i = 0; i < reversedNavList.length; i++) {
      var name = reversedNavList[i];
      var btn2 = $(`<div><button class="nav-button show-nav-button hidden" value = "${i}">${name.split("\nboltz")[0]}</button></div>`);
      if(i === reversedNavList.length - 2) {
        btn2 = $(`<div><button class="nav-button show-nav-button" value = "${i}">${name.split("\nboltz")[0]}</button></div>`);
      }
      if(i === reversedNavList.length - 1) {
        btn2 = $(`<div><button class="nav-button show-nav-button selected" value = "${i}">${name.split("\nboltz")[0]}</button></div>`);
      }
      $("#show-nav").append(btn2);
      (function(btn2, name) {
        btn2.on('click', function(e) {
          //highlight the selected button
          $('.nav-button.selected').removeClass('selected');
          $('.nav-button').filter(function() {
            var currText = $(this).text();
              // important: the name check for nav history and 
              // nav tools are hard coded here
              // if the name for them changed, here should be changed
              return  currText === name || currText === (name + " ◀");
          }).addClass("selected");
          //create rolling effect for show nav buttons
          $('.show-nav-button').addClass('hidden');
          var btn2Val = parseInt(btn2.val());
          $('.show-nav-button[value="' + btn2Val.toString() + '"]').removeClass('hidden');
          if(btn2Val - 1 >= 0) {
            $('.show-nav-button[value="' + (btn2Val - 1).toString() + '"]').removeClass('hidden');
          }
          //navList length hsould be length of btn2, use another array!
          if(btn2Val + 1 < navList.length) {
            $('.show-nav-button[value="' + (btn2Val + 1).toString() + '"]').removeClass('hidden');
          }
          //navigate nodes
          try { 
            navigateTo(cy, name);
          } catch (e) {
            console.error(e);
          }
        });
      })(btn2, name);
    }
 }

 // start from the first place, get the navigation list
 function setRankedNavList(data, value) {
    var binding = data.results.bindings;
    if(binding.length === 0) {
        navList = [value];
        return;
    }
    unsortedNavSet.clear();
    unsortedNavSet.add(value);
    for(let i = 0; i < binding.length; i++) {
      var curr = binding[i];
      unsortedNavSet.add(curr.yLabel.value);
    }
    binding = binding.filter(function(ele){
      var curr = ele.xLabel.value;
      return unsortedNavSet.has(curr);
    });
    // construct mapping from name to Qnumber
    var nameToQnumber = {};
    for(let i = 0; i < binding.length; i++) {
        var curr = binding[i];
        nameToQnumber[curr.xLabel.value] = curr.x.value.split("/data/")[1];
        nameToQnumber[curr.yLabel.value] = curr.y.value.split("/data/")[1];
    }
    var nodes = {};
    var done = false;
    while(!done) {
      done = true
      for(let i = 0; i < binding.length; i++) {
        var curr = binding[i];
        var p = curr.xLabel.value;
        var q = curr.yLabel.value;
        if(!nodes.hasOwnProperty(p)) {
          nodes[p] = 0;
        }
        if(!nodes.hasOwnProperty(q)) {
          nodes[q] = 0;
        }
        if(nodes[q] < nodes[p] + 1) {
          nodes[q] = nodes[p] + 1
          done = false;
        }
      }
    }
    
    navList = [];
    
    Object.keys(nodes).forEach(function(key) {
      var value = nodes[key];
      var temp = {};
      temp.order = value;
      temp.name = key;
      navList.push(temp);
    })
    navList = navList.sort((a, b) => {
      if (a.order < b.order) {
        return -1;
      }
    });
    for(let i = 0; i < navList.length; i++) {
      navList[i] = navList[i].name + "\nboltz:" + nameToQnumber[navList[i].name];
    }
  }

  // get the url to navigation list query
  function navListQuery(value, perform_query) {
    const prevquery = document.getElementById("sparql");
  prevquery.innerHTML = 
     `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
      PREFIX kgo: <http://solid.boltz.cs.cmu.edu:3030/ontology/>
      PREFIX boltz: <http://solid.boltz.cs.cmu.edu:3030/data/> 
      PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
      PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> 
      PREFIX qudt:  <http://qudt.org/schema/qudt/>
      PREFIX unit:  <http://qudt.org/vocab/unit/> 
      PREFIX xsd: <http://www.w3.org/2001/XMLSchema#> 
      PREFIX list: <http://jena.hpl.hp.com/ARQ/list#> 
      PREFIX qu: <http://purl.oclc.org/NET/ssnx/qu/qu#> 
      PREFIX qud: <http://qudt.org/1.1/schema/qudt#> 
      PREFIX la: <https://linked.art/ns/terms/>
      PREFIX un: <http://www.w3.org/2007/ont/unit#> 
      PREFIX uni: <http://purl.org/weso/uni/uni.html#> 
      SELECT ?x ?y ?xLabel ?yLabel
      WHERE {
        BIND ( '${value}'@en AS ?prefLabel).
        ?Q skos:prefLabel ?prefLabel .
        ?Q kgo:locatedInAdministrativeRegion+ ?y.
        ?x kgo:locatedInAdministrativeRegion ?y.
        ?x rdfs:label|skos:prefLabel ?xLabel.
        ?y rdfs:label|skos:prefLabel ?yLabel.
      }`; 

      
      if (perform_query) {
      const endpoint = d3.select("#endpoint").property("value")
      const sparql = d3.select("#sparql").property("value")
      const url = endpoint + "?query=" + encodeURIComponent(sparql)
      return url
      } else {
      return false
      }
  }

  // set nav history buttons, value is the start city
  function setNavHistoryButtons(cy, value) {
    const navListPairsUrl = navListQuery(value, true);
    d3.json(navListPairsUrl).then(function(data) {setRankedNavList(data, value); setNavHistory(cy); setNavButtons(cy);});
  }

  // update the nav history buttons and nav tools
  function updateNav(cy) {
    currLabel = currentNode.json().data.label;
    var currRegion = currLabel.split("\nboltz:")[0];
    if(navList.includes(currLabel)) {
      // update nav history
      $('.nav-button.selected').removeClass('selected');
      $('.nav-button').filter(function() {
          var currText = $(this).text();
          // important: the name check for nav history and 
          // nav tools are hard coded here
          // if the name for them changed, here should be changed
          return  currText === currRegion || currText === (currRegion + " ◀");
      }).addClass("selected");
      //update nav tool create rolling effect for show nav buttons
      var btn2 = $('.show-nav-button').filter(function() {
        return $(this).text() === currRegion;
      });
      $('.show-nav-button').addClass('hidden');
      var btn2Val = parseInt(btn2.val());
      $('.show-nav-button[value="' + btn2Val.toString() + '"]').removeClass('hidden');
      if(btn2Val - 1 >= 0) {
        $('.show-nav-button[value="' + (btn2Val - 1).toString() + '"]').removeClass('hidden');
      }
      if(btn2Val + 1 < navList.length) {
        $('.show-nav-button[value="' + (btn2Val + 1).toString() + '"]').removeClass('hidden');
      }
    } else {
      // only works for left nav history
      // still need to fix sibling things for nav tools on the right
      setNavHistoryButtons(cy, currRegion);
    }
  }

  