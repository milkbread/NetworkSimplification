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
		.attr("id", function(d) { return d.name; })
		.property("checked", true)
		.on("change", function(d) {
			if (d3.select(this).property("checked")) {
				d.group.attr("visibility", "visible")
			} else {
				d.group.attr("visibility", "hidden")
			}
		})
	toolbarElements.append("label")
		.text(function(d) { return d.description; })
		.attr("for", function(d) { return d.name; })
}

function Selector(container, heading_) {
	var self = this;
	var heading = typeof heading_ !== 'undefined' ? heading_ : "Selector";

	self.selector = container.append("div").attr("class", "selector");

	self.selector.append("h1").attr("class", "selectorhead").text(heading);

	self.selectedID = function() {
		return self.select.property("value");
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