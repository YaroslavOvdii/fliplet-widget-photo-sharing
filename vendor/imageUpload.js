// Wait for PhoneGap to load
document.addEventListener("deviceready", onDeviceReady, false);
var pictureSource;   // picture source
var destinationType; // sets the format of returned value
var images = {};
var index;
var currentID;
var currentevent;
var blob;
// PhoneGap is ready
function onDeviceReady() {
	index = 0;
	if ( typeof navigator.camera !== 'undefined' ) {
		pictureSource = navigator.camera.PictureSourceType;
		destinationType = navigator.camera.DestinationType;
	}

	$.each($(".input-file"), function () {
		this.addEventListener('fieldDataReady', function(e) {
			var field = e.detail.field;
			var fieldName = e.detail.field.name;
			field.fieldData.data = images[fieldName].base64thumb;
			field.mediaData.data = images[fieldName].base64;
		},false);
	});

	$(".selectimage").click(function (event) {
		event.preventDefault();
		currentID = event.target.name;
		var boundingRect = this.parentNode.getBoundingClientRect();

		var onConfirm = function(buttonIndex) {

			switch (buttonIndex) {
				case 1 :
					getPicture("camera",boundingRect);
					break;
				case 2 :
					getPicture("album",boundingRect);
					break;
				default :
					document.body.focus();
					return false;
			}
		};

		var buttonLabels = ["Take Photo", "Choose Existing Photo", "Cancel"];
	 	navigator.notification.confirm(
			'How do you want to choose your image?',
			onConfirm,
			'Choose Image',
			buttonLabels
		);
	});
}

function getPicture(source,boundingRect) {
	if ( typeof navigator.camera === 'undefined' ) {
	 	navigator.notification.alert(
	 		"It looks like your app does not support file upload. Please contact the support team for more information.",
	 		function(){},
	 		"Sorry",
	 		"OK"
	 	);
	 	return;
	}

	if (typeof cameraVars == "undefined") {
		cameraVars = Camera;
	}

	if(source === "album") {
		source = cameraVars.PictureSourceType.PHOTOLIBRARY;
	} else {
		source = cameraVars.PictureSourceType.CAMERA;
	}

	var popoverOptions = { arrowDir : cameraVars.PopoverArrowDirection.ARROW_ANY };
	if ( typeof boundingRect === 'object' ) {
		popoverOptions.x = boundingRect.left;
		popoverOptions.y = boundingRect.top;
		popoverOptions.width = boundingRect.width;
		popoverOptions.height = boundingRect.height;
	}

	navigator.camera.getPicture(uploadPhoto, function(message) {
		console.log('get picture failed');
	},{
		quality: 80,
		destinationType: cameraVars.DestinationType.DATA_URL,
		sourceType: source,
		targetWidth: 1024,
		targetHeight: 1024,
		popoverOptions : popoverOptions
	});

}

function uploadPhoto(imageURI) {
	console.log(imageURI);
	if( typeof images[currentID] == "undefined") {
		images[currentID] = [];
	}
	images[currentID] = {
		base64 : imageURI,
		selected : true,
	};

	$canvas = $("canvas");
	var imgsrc = "data:image/jpeg;base64," +imageURI;
	var width = 800;
	var height = 800;
	$canvas[0].width = width;
	$canvas[0].height = height;
	var context = $canvas[0].getContext('2d');
	var img = new Image();
	var newimage = null;

	img.onload = function() {

		var imgwidth = img.width;
		var imgheight = img.height;

		if (imgwidth > imgheight) {
			if (imgwidth > width) {
				imgheight *= width / imgwidth;
				imgwidth = width;
			}
		} else {
			if (imgheight > height) {
				imgwidth *= height / imgheight;
				imgheight = height;
			}
		}
		var drawx = ((width - imgwidth) > 0) ?  (width - imgwidth)/2 : 0 ;
		var drawy = ((height - imgheight) > 0 ) ?  (height - imgheight)/2 : 0 ;

 		context.drawImage(this, drawx, drawy, imgwidth, imgheight);
		newimage = $canvas[0].toDataURL("image/jpeg");

    function dataURItoBlob(dataURI) {
      var binary = atob(dataURI.split(',')[1]);
      var array = [];
      for(var i = 0; i < binary.length; i++) {
        array.push(binary.charCodeAt(i));
      }
      return new Blob([new Uint8Array(array)], {type: 'image/jpeg'});
    }

    var blob = dataURItoBlob(newimage);

		//$thumbnails.append("<img id='thumbnailTSW' src='"+ newimage +"'data-index='"+index +"' />");
		//$thumbnails.find("img").last().click(function () {
		//THE LINE BELOW MUST BE ENABLED WHEN MULTIPLE UPLOADS ARE ENABLED
		//images[currentID][$(this).data("index")].selected = !images[currentID][$(this).data("index")].selected;
		//});
		//index++;
		//images[currentID][images[currentID].length - 1].base64thumb = newimage.split(",")[1];
		images[currentID].base64thumb = newimage.split(",")[1];


		var event = new CustomEvent(
			"thumbCanvasReady",
			{
				bubbles: true,
				cancelable: true
			}
		);
		$canvas[0].dispatchEvent(event);
	};
	img.src = imgsrc;
}
