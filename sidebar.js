function Toolbar(container, groups, heading_) {
	var self = this;
	var heading = typeof heading_ !== 'undefined' ? heading_ : "Toolbar";

	var toolbar = container.append("div").attr("class", "toolbar");

	toolbar.append("h1").attr("class", "toolbarhead").text(heading);

	var toolbarElements = toolbar.selectAll("input")
		.data(groups)
		.enter().append("div");

	toolbarElements.append("input")
		.attr("type", "checkbox")
		.attr("id", function(group) { return group.name; })
		.property("checked", function(group,i) {return group.visibility === "visible" ? true : false;})
		.on("change", function(group) {
			// Update the visibility-element of the group-object
			if (d3.select(this).property("checked")) {
				group.visibility = "visible";
			} else {
				group.visibility = "hidden";
			}
			// Update the visibility of the group-object 'svgGroup'
			group.svgGroup
				.attr("visibility", function() {
					return group.visibility;
				});
		})
	toolbarElements.append("label")
		.text(function(group) { return group.description; })
		.attr("for", function(group) { return group.name; })

	self.initGroupVisibility = function() {
		groups.forEach(function(group) {
			group.svgGroup
				.attr("visibility", function() {
					return group.visibility;
				});
		})
	}
	self.initGroupVisibility();
}

function Selector(container, heading_) {
	var self = this;
	var heading = typeof heading_ !== 'undefined' ? heading_ : "Selector";

	self.selector = container.append("div").attr("class", "selector");

	self.selector.append("h1").attr("class", "selectorhead").text(heading);

	self.selectedID = function() {
		return self.select.property("value");
	}

	self.setSelectedID = function(id) {
		self.select.property("value", id);
	}

	self.addElements = function(elements, type) {
		self.selector.select(".select").remove();
		self.select = self.selector.append("select").attr("class", "select")

		self.select.selectAll("option")
			.data(elements)
				.enter().append("option")
					.attr("value", function(d) { return d.properties.id; })
					.text( function(d) { return type + " " + d.properties.id; });
	}

	self.throwException = function(message) {
		self.selector.select(".select").remove();
		self.selector.append("div")
			.attr("class", "exception select")
			.text(message)
	}
}

function Dummy(container, heading_) {
	var self = this;
	var heading = typeof heading_ !== 'undefined' ? heading_ : "Dummy";
	self.selector = container.append("div").attr("class", "dummy");
	self.selector.append("h1").attr("class", "dummyhead").text(heading);
}