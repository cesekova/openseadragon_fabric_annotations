var openseadragon_image_annotations = {
		rectangle: "",
		isDown: "",
		origX: "",
		origY: "",
	  currentAnnotationType: "rectangle", //stores the type of the current annotation being drawn so we know which variable (rectangle/polygon)
	  overlay: "",
	  imageJson: "", //json annotation file



    /* the mouse can be in 3 modes:
     1.) OSD (for interaction w/ OSD viewer, drag/scroll/zoom around the map)
     2.) addAnnotation (disable OSD mode and enable click/drag on fabricJS canvas to draw an annotation)
     3.) editAnnotation (disable OSD mode and allow editing of existing annotations (but do not draw onclicK))
     getters and setters are below
     */
     mouseMode: "OSD",

     /* Stores whether the image annotation toolbar is currently hidden or not. Can be visible/invisible*/
     imageAnnotationToolbarStatus: "invisible",

    /*
    Annotation type we draw on canvas on click, changed by #annotationType radio menu
    */
    annotationType: "rectangle",

    /*
    Default annotation color to draw annotations in
    */
    currentAnnotationColor: "red",


    /*
    Global setting to show/hide toolbar on default
    */
    showToolbar: "false",

    /*
    Global setting to show/hide annotations on default
    */
    showAnnotations: "true",

    // Toggle image annotation toolbar. Connected to button id=toggleImageAnnotationsMenu in image-view2.handlebars
    toggleMenuBar: function() {
    	if(this.imageAnnotationToolbarStatus=="invisible") {
    		$("#imageAnnotationToolbar").show();
    		this.showToolbar = "true";
    		this.imageAnnotationToolbarStatus="visible";
				document.getElementById("navigateImage").click();
    	}else{
    		$("#imageAnnotationToolbar").hide();
    		this.showToolbar = "false";
    		this.imageAnnotationToolbarStatus="invisible";
    		this.mouseMode = "OSD";
    		this.setMouseMode(this.mouseMode);
    	}
    },

    /*
    Initialize member variables
    */
    initialize: function(imageJson, osdViewer,options) {
    	console.log("initialize");

    	/* Initialize member variables */
	    	this.imageJson = imageJson;
	      this.viewer = osdViewer;
	      this.overlay = this.viewer.fabricjsOverlay(options);
        this.currentAnnotationType = "rectangle";
        this.annotationType = "rectangle";
        this.currentAnnotationColor = "red";
        this.imageAnnotationToolbarStatus = "invisible";

        /* Show/hide toolbar based on default setting, showToolbar */
        if (this.showToolbar === "false") {
        	$("#imageAnnotationToolbar").hide();
        	this.imageAnnotationToolbarStatus = "invisible";
        }else{
        	$("#imageAnnotationToolbar").show();
        	this.imageAnnotationToolbarStatus = "visible";
        }

		// Initialize color picker options
        var spectrumOptions = {
        	showPaletteOnly: true,
        	showPalette: true,
        	palette: [["red", "green", "blue"]],
            color: "red"
        };

        $("#colorPicker").spectrum(spectrumOptions);


        if(openseadragon_image_annotations.showAnnotations == "false") {
        	$("#off").click();
        	openseadragon_image_annotations.turnAnnotationsOnOff("off");
        };



        this.mouseMode = "OSD";
        this.setMouseMode(this.mouseMode);

       // draw annotation from json file
				if (imageJson){
					this.overlay.fabricCanvas().loadFromJSON(imageJson, this.overlay.fabricCanvas().renderAll.bind(this.overlay.fabricCanvas()));
				};

        /****************************************************************************************************************

                                             E V E N T  L I S T E N E R S

      *****************************************************************************************************************/
        //event listeners
        // fabricJS mouse-down event listener

        /*
        mouse:down event listener
        On mousedown:
            - mark isDown as true. On mouse:up, we draw annotations if isDown is true.
            - set origX, origY as the initial click location.
            - initialize the correct function based on what the currentAnnotationType is.
            */
            this.overlay.fabricCanvas().observe('mouse:down', function (o) {

							if (openseadragon_image_annotations.getMouseMode() == "editAnnotation" && o.target && o.target.type == "polygon") {
 							 document.getElementById('edit').disabled = false
						 }else if(!openseadragon_image_annotations.polygon.editShape){
						 document.getElementById('edit').disabled = true
					 };

					   	if (openseadragon_image_annotations.getMouseMode() == "editAnnotation" && o.target && (o.target.type== "rect" || o.target.type == "polygon")){
								openseadragon_image_annotations.set_input_form(o.target);
								$("#input_form").show();
							}

            	if (openseadragon_image_annotations.getMouseMode() == "addAnnotation") {
            		openseadragon_image_annotations.isDown = true;

            		var pointer = openseadragon_image_annotations.overlay.fabricCanvas().getPointer(o.e);
            		openseadragon_image_annotations.origX = pointer.x;
            		openseadragon_image_annotations.origY = pointer.y;
            		switch (openseadragon_image_annotations.annotationType) {
            			case "rectangle":
            			openseadragon_image_annotations.initializeRectangle(pointer.x, pointer.y);
            			break;
            			case "polygon":
									openseadragon_image_annotations.initializePolygon(o, pointer.x, pointer.y);
            			break;
            			default:
            			console.log("That shouldn't have happened :( Undefined annotationType");
            			console.log("The undefined type entered is: " + this.annotationType);
            			throw new Error("Tried to switch to an undefined annotationType");
            		}
            	}
            });

						/*
						object:moving event listener
						if object that is move is cirlce (on of the polygon points),
						start editPolygon function which will update point coordinates
								*/
						  this.overlay.fabricCanvas().on('object:moving', function(o) {
								var objType = o.target.get('type');
								var circle = o.target;
								if(objType =="circle"){
									openseadragon_image_annotations.editPolygon(circle);
							};
							openseadragon_image_annotations.overlay.fabricCanvas().renderAll();

							});

							/*
							 mouse:over event listener
							 if mouse is over polygon or rectangle and polygon is not being edited
							 and no other annotation is selected, show input form
									 */
         this.overlay.fabricCanvas().on('mouse:over', function(o) {
					   if (o.target && (o.target.type== "rect" || o.target.type == "polygon") && !(openseadragon_image_annotations.polygon.polygonMode) && !(openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject())){
							 var annotation = o.target;
							 openseadragon_image_annotations.set_input_form(annotation);
              $("#input_form").show();
						};
        	});

					/*
					 mouse:out event listener
					 when mouse leaves the annotation hide imput form
					 (only if anootation is not selected in edit mode !, then input form should stay so it can be edited,
				   it will be hidden after edit mode is cancelled of annotation id deselected)
							 */
					this.overlay.fabricCanvas().on('mouse:out', function(o) {
						if (!(openseadragon_image_annotations.mouseMode == "editAnnotation" && openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject())){
							 $("#input_form").hide();
						 };
					 });

					 /*
			 		 selection:cleared
			 		  hide input form when annotaion is deselected
			 				 */
				this.overlay.fabricCanvas().on('selection:cleared', function() {
              $("#input_form").hide();
			});

        /*
        mouse:move event listener
        If isDown is true and the mouse if moved, redraw the
				currentAnnotationShape on canvas with the new current mouse position.
        */
        this.overlay.fabricCanvas().on('mouse:move', function(o) {
        if (!openseadragon_image_annotations.isDown ) return;
        	var pointer = openseadragon_image_annotations.overlay.fabricCanvas().getPointer(o.e);
        	switch (openseadragon_image_annotations.annotationType) {
        		case "rectangle":
        		openseadragon_image_annotations.updateRectangleWidth(pointer.x, pointer.y);
        		break;
        		case "polygon":
							openseadragon_image_annotations.updatePolygon(pointer.x, pointer.y);
        		break;
        		default:
        		console.log("That shouldn't have happened :( Undefined annotationType");
        		console.log("The undefined type entered is: " + this.annotationType);
        		throw new Error("Tried to switch to an undefined annotationType");
        	}
        	openseadragon_image_annotations.overlay.fabricCanvas().renderAll();
        });


        /*
        mouse:up event listener
        - set isDown atribute to false and turn of canvas interactivity (if polygon is not being drawn)
				- if rectangle was being drawn, finish drawing, switch to editmode, select the rectangle,
				initialize input form and show the input form
        */
        this.overlay.fabricCanvas().on('mouse:up', function (o) {

        	if(openseadragon_image_annotations.getMouseMode() == "addAnnotation") {
        		var pointerOnMouseUp = openseadragon_image_annotations.overlay.fabricCanvas().getPointer(event.e);

                // Set fabric interactivity to false
                openseadragon_image_annotations.setFabricCanvasInteractivity(false);

            };
						// if we are drwaing polygon left isDown on true
						if (!(openseadragon_image_annotations.currentAnnotationType.type == "polygon" && openseadragon_image_annotations.polygon.polygonMode)){
            	openseadragon_image_annotations.isDown = false;
							if (openseadragon_image_annotations.rectangle){
								// remove modified rectangle
								openseadragon_image_annotations.overlay.fabricCanvas().remove(openseadragon_image_annotations.rectangle)
								// add finished rectangle
								openseadragon_image_annotations.overlay.fabricCanvas().add(openseadragon_image_annotations.rectangle);
								document.getElementById("editAnnotation").click();
								openseadragon_image_annotations.overlay.fabricCanvas().setActiveObject(openseadragon_image_annotations.rectangle);
								openseadragon_image_annotations.set_input_form(openseadragon_image_annotations.rectangle);
							   $("#input_form").show();
								openseadragon_image_annotations.rectangle = "";


							}
						}
        });

        // Listen for mouse mode changes
        $("input[name='cursorMode']").change(function () {
        	var mode = $("input[name='cursorMode']:checked").val();
        	openseadragon_image_annotations.setMouseMode(mode);
        });

        // Listen and set for annotations on/off
        $("input[name='annotationsOnOrOff']").change(function () {
        	var onOff = $("input[name='annotationsOnOrOff']:checked").val();
        	openseadragon_image_annotations.turnAnnotationsOnOff(onOff);
        });

        // Listen for user-selected annotationType
        $("input[name='annotationType']").change(function () {
        	openseadragon_image_annotations.annotationType = $("input[name='annotationType']:checked").val();
        });

        // listen for annotation send button
				$('#sendAnnotation').click(function (event) {
					console.log("sending");
					//generate ASAPXML annotations
					 var doc = generate_ASAPxml(openseadragon_image_annotations.overlay.fabricCanvas()._objects);
				   var xml_text = new XMLSerializer().serializeToString(doc);

          // get file name from probabilities layer (axperiment:slide)
					 var probabs_url_array = openseadragon_image_annotations.viewer.tileSources[2].split("=")[1].split("/");
				   var slide = probabs_url_array.pop().split(".")[0].slice(0,-4);
				   var experiment = probabs_url_array.pop();
				   var file_name = [experiment, slide].join(":");

						//prepare data to be send, (file_name and xml with annotations)
					 var send_data = {"name": file_name, "xml":xml_text};
           console.log(send_data);

					 $.ajaxSetup({
	 headers: {
			 'Content-Type': 'application/json',
			 'Accept': 'application/json'
	 }
});
  //send data to url
					 $.post('',  // url
        JSON.stringify(send_data), // data to be submit
       function(data, status, xhr) {   // success callback function
                alert('status: ' + status + ', data: ' + data.responseData);
            });
				});


       // download annotation as default json file and generated ASAP xml file
         $('#downloadAnnotation').click(function (event) {
					 //json
					 var text = JSON.stringify(openseadragon_image_annotations.overlay.fabricCanvas().toObject(['comment','a_group']));
					 var json_data = new Blob([text], {type: 'text/plain'});
					 var url1 = window.URL.createObjectURL(json_data);
					 document.getElementById('download_link1').href = url1;
					 document.getElementById('download_link1').click();
					 //asap xml
					 var doc = generate_ASAPxml(openseadragon_image_annotations.overlay.fabricCanvas()._objects);
					 var xml_text = new XMLSerializer().serializeToString(doc);
					 var xml_data = new Blob([xml_text], {type: 'text/plain'});
					 var url2 = window.URL.createObjectURL(xml_data);
					 document.getElementById('download_link2').href = url2;
					 document.getElementById('download_link2').click();


						});

            // create ASAP xml form with neccessary tags
					 function generate_ASAPxml(canvas_objects){
						// first, create xml dom
					 doc = document.implementation.createDocument("", "", null);
  			 	 ASAP_annot = doc.createElement("ASAP_Annotations");
  		 		 xml_annotations = doc.createElement("Annotations");
  	 			 ASAP_annot.appendChild(xml_annotations);
  				 doc.appendChild(ASAP_annot);

          // for each object (annotation) create new annotation element with coresponding coordinates
					for (var i = 0; i< canvas_objects.length; i++){
					var obj = canvas_objects[i];
					if (obj.type == "circle"){
						continue
					};
					var xml_annotation = doc.createElement("Annotation");
  				xml_annotation.setAttribute("Name", "Annotation "+i);
					if (obj.type == "rect"){
						xml_annotation.setAttribute("Type", "Rectangle");
						var coordinates = generate_rect_ASAP_coord(obj);
					}
					if (obj.type == "polygon"){
						xml_annotation.setAttribute("Type", "Polygon");
						var coordinates = generate_polygon_ASAP_coord(obj);
					}
  				xml_annotation.setAttribute("PartOfGroup", obj.a_group);
  				xml_annotation.setAttribute("Color", "#F4FA58");
					//get coordinates in ASAP format
  				var xml_coordinates = doc.createElement("Coordinates");


				// create new coordinate element for each coordinate
				for (var j = 0; j < coordinates.length; j++) {
				var xml_coordinate = doc.createElement("Coordinate");
				xml_coordinate.setAttribute("Order", j);
				xml_coordinate.setAttribute("X", coordinates[j][0]);
				xml_coordinate.setAttribute("Y", coordinates[j][1]);
				xml_coordinates.appendChild(xml_coordinate);
				}
				// append coordinates to annotation
				xml_annotation.appendChild(xml_coordinates);
				// append whole annotation to annotations
				xml_annotations.appendChild(xml_annotation);
			}
		return doc
		};

	 function generate_rect_ASAP_coord(rect){
		 // calculate 4 coordinates of square annotation
		 var coordinates = [];
		 coordinates[0] = [rect.left+rect.width, rect.top];
		 coordinates[1] = [rect.left, rect.top];
		 coordinates[2] = [rect.left, rect.top+rect.height];
		 coordinates[3] = [rect.left+rect.width, rect.top+rect.height];
    return coordinates;
	 };

	 function generate_polygon_ASAP_coord(polygon){
		 // calculate  coordinates of plygon annotation
		var coordinates = [];
	  for (var j = 0; j < polygon.points.length; j++) {
         coordinates[j] = [polygon.points[j].x, polygon.points[j].y]
		 };
    return coordinates;
	 };


        // listen for changes in opacity slider and change opacity for each annotation
				$("#opacity_control").on("input",function (){
				 var opacity = $(this).val();
				 openseadragon_image_annotations.overlay.fabricCanvas().forEachObject(function(obj){
    	 	 obj.opacity = opacity;
           });

					openseadragon_image_annotations.overlay.fabricCanvas().renderAll();

				});

				/*
          listener form object:modified
					-recalcute coordinates for annotations
				*/
				this.overlay.fabricCanvas().on("object:modified", function (o) {

					var canvas = openseadragon_image_annotations.overlay.fabricCanvas();
          if (o.target.type == "rect"){
						// set correct coordinates when object is scaling
						o.target.width *= o.target.scaleX;
            o.target.height *= o.target.scaleY;
            o.target.scaleX = 1;
            o.target.scaleY = 1;
						openseadragon_image_annotations.set_input_form(o.target);
						$("#input_form").show();

					};

					// if polygon is being modified (size and position, not separate points)
				  if (o.target.type!= "polygon" || openseadragon_image_annotations.polygon.editShape != false ){ return};
					var original_polygon = o.target;
				  var matrix = original_polygon.calcTransformMatrix();
				  var transformedPoints =original_polygon.get("points")
				    .map(function(p){
				      return new fabric.Point(
				         p.x - original_polygon.pathOffset.x,
				         p.y - original_polygon.pathOffset.y);
				    })
				  .map(function(p){
				    return fabric.util.transformPoint(p, matrix);
				  });

         // create new polygon with updated coordinates
					var modified_polygon = new fabric.Polygon(transformedPoints,{
							strokeWidth:0.5,
							stroke: openseadragon_image_annotations.currentAnnotationColor,
							fill: openseadragon_image_annotations.currentAnnotationColor,
							opacity: $("#opacity_control").val(),
							comment: original_polygon.comment,
							a_group: original_polygon.a_group,
							hasRotatingPoint: false

					});
					// remove orignal polygon and replace it with modified one
					canvas.remove(original_polygon);
					canvas.add(modified_polygon).renderAll();
					canvas.setActiveObject(modified_polygon);
					openseadragon_image_annotations.set_input_form(modified_polygon);
					$("#input_form").show();
				});

        // toggle editing polygon
				$('#edit').click(function (event){
					//if polygon was in edit polygon mode, finish modification by generating new polygon
					if (openseadragon_image_annotations.polygon.editShape){
						openseadragon_image_annotations.polygon.generatePolygon(openseadragon_image_annotations.polygon.pointArray);
						openseadragon_image_annotations.overlay.fabricCanvas().renderAll();
						//document.getElementById('edit').disabled = true;
					}else{ //if polygon is selected start polygon editing by points
					if (openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject() && openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject().type != "polygon"){return}
						var polygon = openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject();
							openseadragon_image_annotations.initializeEditPolygon(polygon);
		};
	});

       // update annotation group (from input form)
   $("#annotation_group").on("change",function (){
		 var annotation = openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject();
		 annotation.set({a_group: $(this).val()});

	 });
 //update annotation comment (from input form)
	 $("#annotation_comment").on("input",function (){
		var annotation = openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject();
		if (annotation){
			annotation.set({comment: $(this).val()})
		};

	});
       // delete selected annotation
        $('#deleteSelected').click(function() {
					//if polygon is being drawn, delete it
					if  (openseadragon_image_annotations.polygon.polygonMode == true){
						openseadragon_image_annotations.polygon.activeShape.remove();
						openseadragon_image_annotations.polygon.pointArray.forEach(function (point) {
							openseadragon_image_annotations.overlay.fabricCanvas().remove(point)
					  });
						openseadragon_image_annotations.polygon.lineArray.forEach(function (line) {
							openseadragon_image_annotations.overlay.fabricCanvas().remove(line)
					  });
						openseadragon_image_annotations.polygon.polygonMode = false;

					}else  {openseadragon_image_annotations.deleteActiveAnnotation()};
        });

       // delete all annotation
        $('#deleteAll').click(function() {
					// if polygon was mid-drawing resets all parameters
					openseadragon_image_annotations.polygon.polygonMode = false;
        	openseadragon_image_annotations.deleteAllAnnotations();
        });

         // set color for future annotation and change color of selected one
        $("#colorPicker").on('change.spectrum', function (e, color) {
            openseadragon_image_annotations.currentAnnotationColor = color.toHexString(); //convert to hex
						var annotation = openseadragon_image_annotations.overlay.fabricCanvas().getActiveObject();
						if (annotation){
							annotation.set({fill: openseadragon_image_annotations.currentAnnotationColor});
							openseadragon_image_annotations.overlay.fabricCanvas().renderAll();
						}
        });



    }, // end of initialize

    /****************************************************************************************************************

                                    A N N O T A T I O N S (Initializers and Updaters)

    *****************************************************************************************************************/
    // initialize rectabgle of 1x1 from point(x,y)
    initializeRectangle: function(x, y) {
    	this.rectangle = new fabric.Rect({
    		left: x,
    		top: y,
				fill: this.currentAnnotationColor,
				opacity: $("#opacity_control").val(),
    		strokeWidth: 2,
    		stroke: this.currentAnnotationColor,
    		width: 1,
      	height: 1,
    		scaleX: 1,
    		scaleY: 1,
    		type: 'rect',
				hasRotatingPoint: false


    	});
    	this.currentAnnotationType = this.rectangle;
    	this.overlay.fabricCanvas().add(this.rectangle);

    },
     // when rectabgle is being drag to point(x,y), update its width/height accordingly
    updateRectangleWidth: function(x, y) {
			if(this.origX>x){
			 this.rectangle.set({ left: Math.abs(x) });
		 };
	    if(this.origY>y){
			 this.rectangle.set({ top: Math.abs(y) });
		 };
    	var width = Math.abs(x - this.origX);
    	var height = Math.abs(y - this.origY);
    	this.rectangle.set({width: width, height: height});
    	this.currentAnnotationType = this.rectangle;



    },

   initializePolygon: function(o,x, y) {
		 // of polygon mode was not active start drawing polygon
		if (this.polygon.polygonMode == false){
					this.polygon.drawPolygon();
				};
			// if new point is the same as starting point, generate final polygon
		if(o.target && o.target.type == "circle" && o.target.id == this.polygon.pointArray[0].id){
		this.polygon.generatePolygon(this.polygon.pointArray);
						}
			// if not, draw new point
		if(this.polygon.polygonMode){
			this.polygon.addPoint(x, y);
				}
			},


   // add new point to polygon while drawing
			updatePolygon: function(x, y) {
				if(this.polygon.activeLine && this.polygon.activeLine.class == "line"){
						this.polygon.activeLine.set({ x2: x, y2: y });
						var points = this.polygon.activeShape.get("points");
						points[this.polygon.pointArray.length] = {
								x:x,
								y:y
						}
						this.polygon.activeShape.set({
								points: points
						});
				}
	    },

// initialize polygon (p) edit by showing polygon points and make them interactive
		initializeEditPolygon: function(p){
			//save original input form attributes
			this.polygon.input_attributes = {
				comment: p.comment,
				a_group: p.a_group,
			};
			 var points = p.get("points");
			 var zoom = this.overlay.fabricCanvas().getZoom();
			 var circle_size = 0;
			 if (zoom < 0.01) {circle_size = 1000}
			 else if (zoom < 0.03) {circle_size = 500}
			 else if (zoom < 0.1) {circle_size = 100}
			 else if (zoom < 0.3) {circle_size = 50}
			 else {circle_size = 20};
		 points.forEach(function(point, index) {
		 var circle = new fabric.Circle({
			 radius: circle_size,
			 fill: 'red',
			 left: point.x,
			 top: point.y,
			 originX: 'center',
			 originY: 'center',
			 hasControls: false,
			 name: index
		 });
		openseadragon_image_annotations.polygon.pointArray.push(circle);
		 openseadragon_image_annotations.overlay.fabricCanvas().add(circle);
		 openseadragon_image_annotations.overlay.fabricCanvas().renderAll();
	 });
	 p.set({selectable:false, evented:false, fill: '#cccccc'});
   this.polygon.editShape = p;
	 this.overlay.fabricCanvas().remove(p);
	 this.overlay.fabricCanvas().add(this.polygon.editShape);
	 this.overlay.fabricCanvas().sendToBack(this.polygon.editShape);


		},


    // change position of one of the polygons points (p) and redrawn polygon
		editPolygon: function(p){
			this.polygon.editShape.points[p.name] = {x: p.getCenterPoint().x, y: p.getCenterPoint().y};
			 this.overlay.fabricCanvas().remove(this.polygon.editShape);
			 this.polygon.editShape = new fabric.Polygon(this.polygon.editShape.points,{
					  selectable: false,
						evented: false,
						opacity: $("#opacity_control").val(),
						fill: '#cccccc'
					});
			 this.overlay.fabricCanvas().add(this.polygon.editShape);
			 this.overlay.fabricCanvas().sendToBack(this.polygon.editShape);

		},


        setFabricCanvasInteractivity: function(boolean) {
        	this.overlay.fabricCanvas().forEachObject(function (object) {
        		object.selectable = boolean;
        	});
        },

        deselectFabricObjects: function(){
        	this.overlay.fabricCanvas().deactivateAll().renderAll();
        },

        setMouseMode: function(mode) {
        	switch (mode) {
        		case "OSD":
        		this.mouseMode = "OSD";
        		this.setFabricCanvasInteractivity(false);
        		this.deselectFabricObjects();
        		this.viewer.setMouseNavEnabled(true);
						$("#input_form").hide();
        		break;
        		case "addAnnotation":
						// if polygon was being edited, finish the edit
						if (openseadragon_image_annotations.polygon.editShape != false){
							document.getElementById('edit').click();
						};
        		this.mouseMode = "addAnnotation";
        		this.setFabricCanvasInteractivity(false);
        		this.deselectFabricObjects();
        		this.viewer.setMouseNavEnabled(false);
						$("#input_form").hide();
        		break;
        		case "editAnnotation":
        		this.mouseMode = "editAnnotation";
        		this.setFabricCanvasInteractivity(true);
        		this.viewer.setMouseNavEnabled(false);
        		break;
        		default:
        		console.log(mode);
        		throw "Tried to set invalid mouse mode";
        	}
        },

        getMouseMode: function() {
        	return this.mouseMode;
        },

    // delete the currently selected annotation from the canvas
    deleteActiveAnnotation: function() {
        // Break out if no annotation is currently selected
        if(this.overlay.fabricCanvas().getActiveObject() == null) {
        	alert("Please select the annotation you would like to delete");
        	return;
        }
        var annotation = this.overlay.fabricCanvas().getActiveObject();
				if (annotation.type == "rect" || annotation.type == "polygon"){
				annotation.remove();
			};

    },

    // Get all objects from canvas
    deleteAllAnnotations: function() {
        var objects = openseadragon_image_annotations.overlay.fabricCanvas().getObjects();
        /* if objects is null, catch */
        if(objects.length == 0) {
            console.log("No annotations on canvas to delete");
            return;
        }
				var objectsLength = objects.length
			         for (var i = 0; i < objectsLength; i++) {
			            objects[objectsLength-i-1].remove();
			         }
    },


    turnAnnotationsOnOff: function(onOrOff) {
    	var objects = openseadragon_image_annotations.overlay.fabricCanvas().getObjects();
    	if (onOrOff == "off") {
    		openseadragon_image_annotations.showAnnotations = "false";
    		for (var i = 0; i < objects.length; i++) {
                //set all objects as invisible and lock in position
                objects[i].visible = false;
                objects[i].lockMovementX = true;
                objects[i].lockMovementY = true;
                objects[i].lockRotation = true;
                objects[i].lockScalingFlip = true;
                objects[i].lockScalingX = true;
                objects[i].lockScalingY = true;
                objects[i].lockSkewingX = true;
                objects[i].lockSkewingY = true;
                objects[i].lockUniScaling = true;
            }
				openseadragon_image_annotations.overlay.fabricCanvas().deactivateAll().renderAll();
				 $("#input_form").hide();
        }else{
        	openseadragon_image_annotations.showAnnotations = "true";
            //set all objects as visible and unlock
            for (var i = 0; i < objects.length; i++) {
            	objects[i].visible = true;
            	objects[i].lockMovementX = false;
            	objects[i].lockMovementY = false;
            	objects[i].lockRotation = false;
            	objects[i].lockScalingFlip = false;
            	objects[i].lockScalingX = false;
            	objects[i].lockScalingY = false;
            	objects[i].lockSkewingX = false;
            	objects[i].lockSkewingY = false;
            	objects[i].lockUniScaling = false;
            }
        }
        openseadragon_image_annotations.overlay.fabricCanvas().renderAll();
    },

  // set input form with default values or annotation attributes
	//(e.g if annotation was imported)
   set_input_form: function(annotation){
		 document.getElementById("annotation_type").value = annotation.type

		 if (annotation.comment){
			 document.getElementById("annotation_comment").value = annotation.comment;
		 }else{document.getElementById("annotation_comment").value = "" };

		 if (!(annotation.a_group)){
			 annotation.set({a_group:"None" })
		 };
			 document.getElementById("annotation_group").value = annotation.a_group;





   // set position of the input form
	  var viewport_coordinates = this.viewer.world.getItemAt(0).imageToViewportCoordinates(annotation.left + annotation.width, annotation.top);
		var pixel_coordinates = this.viewer.viewport.pixelFromPoint(viewport_coordinates);
		document.getElementById("input_form").style.position = "absolute";
    document.getElementById("input_form").style.top = String(pixel_coordinates.y - 10)+"px";
		document.getElementById("input_form").style.left = String(pixel_coordinates.x + 10)+"px";


	 },


	   // name space for polygon manupulation
	polygon : {
	min : 99,
 	 max : 999999,
 	 polygonMode : false, // is polygon being drawn/edited
 	 pointArray : new Array(),
 	 lineArray : new Array(),
 	 activeLine: null,
 	 activeShape : false,
	 editShape: false,
	 input_attributes: {},

// initialize attributes, prepare for new drawing
		drawPolygon : function() {
        this.polygonMode = true;
        this.pointArray = new Array();
        this.lineArray = new Array();
        this.activeLine = null;
				 this.activeShape = false;
				 this.editShape = false;
				 this.input_attributes = {};
    },
    addPoint : function(x,y) {

				// get name of point
        var random = Math.floor(Math.random() * (this.max - this.min + 1)) + this.min;
        var id = new Date().getTime() + random;
				// calcute size of the point(1000px - 20px) based on zoom (0-1.1)
				var zoom = openseadragon_image_annotations.overlay.fabricCanvas().getZoom();
				var circle_size = 0;
				if (zoom < 0.01) {circle_size = 1000}
				else if (zoom < 0.03) {circle_size = 500}
				else if (zoom < 0.1) {circle_size = 100}
				else if (zoom < 0.3) {circle_size = 50}
				else {circle_size = 20};
        //create circle representation of the point
        var circle = new fabric.Circle({
            radius: circle_size,
            fill: '#F58B8B',
            stroke: '#333333',
            strokeWidth: 0.5,
            left: x,
            top: y,
            selectable: false,
            hasBorders: false,
            hasControls: false,
            originX:'center',
            originY:'center',
            id:id,
            objectCaching:false
        });
        if(this.pointArray.length == 0){
            circle.set({
                fill:'red'
            })
        }
        circle.lockMovementX = circle.lockMovementY = true;

        var points = [x,y,x,y];
        line = new fabric.Line(points, {
            strokeWidth: 4,
            fill: '#red',
            stroke: '#999999',
            class:'line',
            originX:'center',
            originY:'center',
            selectable: false,
            hasBorders: false,
            hasControls: false,
            evented: false,
            objectCaching:false
        });

        if(this.activeShape){
            var points = this.activeShape.get("points");
            points.push({
                x: x,
                y: y
            });
            var polygon = new fabric.Polygon(points,{
                stroke:'#red',
                strokeWidth:4,
                fill: '#cccccc',
                opacity: 0.3,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: false,
                objectCaching:false
            });
            openseadragon_image_annotations.overlay.fabricCanvas().remove(this.activeShape);
            openseadragon_image_annotations.overlay.fabricCanvas().add(polygon);
            this.activeShape = polygon;
            openseadragon_image_annotations.overlay.fabricCanvas().renderAll();
        }
        else{
            var polyPoint = [{x:x,y:y}];
            var polygon = new fabric.Polygon(polyPoint,{
                stroke:'#red',
                strokeWidth:4,
                fill: '#cccccc',
                opacity: 0.3,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: false,
                objectCaching:false
            });
            this.activeShape = polygon;
            openseadragon_image_annotations.overlay.fabricCanvas().add(polygon);
        }
        this.activeLine = line;

        this.pointArray.push(circle);
        this.lineArray.push(line);

        openseadragon_image_annotations.overlay.fabricCanvas().add(line);
        openseadragon_image_annotations.overlay.fabricCanvas().add(circle);
        openseadragon_image_annotations.overlay.fabricCanvas().selection = false;
    },

		// generate finished polygon
    generatePolygon : function(pointArray){
        var points = new Array();
        $.each(pointArray,function(index,point){
            points.push({
                x:point.left,
                y:point.top
            });
            openseadragon_image_annotations.overlay.fabricCanvas().remove(point);
        });

				if (! this.editShape){
        $.each(this.lineArray,function(index,line){
          openseadragon_image_annotations.overlay.fabricCanvas().remove(line);
        });
        openseadragon_image_annotations.overlay.fabricCanvas().remove(this.activeShape).remove(this.activeLine);
			}else{
				  openseadragon_image_annotations.overlay.fabricCanvas().remove(this.editShape);
			};
        var polygon = new fabric.Polygon(points,{
            strokeWidth:0.5,
						stroke: openseadragon_image_annotations.currentAnnotationColor,
		    		fill: openseadragon_image_annotations.currentAnnotationColor,
					  opacity: $("#opacity_control").val(),
						hasRotatingPoint: false

        });
				// add polygon to canvas, switxh to edit mode, select it, set input form and show the input form
        openseadragon_image_annotations.overlay.fabricCanvas().add(polygon);
				if (openseadragon_image_annotations.mouseMode != "editAnnotation" && openseadragon_image_annotations.mouseMode != "OSD" ){
					document.getElementById("editAnnotation").click();
		   	};
				openseadragon_image_annotations.overlay.fabricCanvas().setActiveObject(polygon);
				polygon.set(this.input_attributes);
				openseadragon_image_annotations.set_input_form(polygon);
				 $("#input_form").show();
				 document.getElementById('edit').disabled = false;

				// reset attributes
        this.input_attributes = {};
				this.pointArray = new Array();
        this.activeLine = null;
        this.activeShape = null;
        this.polygonMode = false;
				this.editShape = false;
    }
} // end of plygon namespace





}; // end of namespace
