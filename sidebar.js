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

	self.option = self.selector.append("select")

	self.selectedID = function() {
		return self.option.property("value");
	}

	self.addElements = function(elements) {
		self.option.selectAll("option")
			.data(elements)
				.enter().append("option")
					.attr("value", function(d) { return d.properties.id; })
					.text( function(d) { return "Line " + d.properties.id; });
	}
}
