Fliplet.Widget.instance('photo-sharing', function(data){
  var widgetUuid = data.uuid;
  var connection;

  var PhotoFeed = (function() {
    var _this;

    // constructor
    var PhotoFeed = function(data) {
      _this = this;
      this.config = data;
      this.imageChunkSize = 20;
      this.attachObservers();
      this.getFeed();
      this.sending = false;
    };

    // prototype
    PhotoFeed.prototype = {
      constructor: PhotoFeed,
      getConnection: function() {
        if (!connection) {
          connection = Fliplet.DataSources.connect(_this.config.dataSourceId, { offline: false });
        }

        return connection;
      },
      overlayInit: function() {
        _this.attachOverlayObservers();
        _this.initiatePV();
        if (Fliplet.Navigator.isOnline()) {
          _this.onlineOverlay();
        } else {
          _this.offlineOverlay();
        }

        // Clean images if any / Initiate Images
        images = {};

        // Use this from imageUpload.js
        onDeviceReady();
      },
      initiatePV: function() {
        var structure = {
          name: ""
        };

        window.pvName = "photo_feed_"+ widgetUuid;
        Fliplet.Security.Storage.init().then(function(){
          Fliplet.Security.Storage.create(pvName, structure).then(function(data){
            window.photoUserPV = data;
            if (data.name !== "") {
              $('.user_name').val(data.name);
            }
          });
        });
      },
      // Observers to be attached when the overlay is launched
      attachOverlayObservers: function() {
        var $name = $('.user_name');
        // When click the upload button
        $(".upload-button").on('click', function() {
          if (Fliplet.Navigator.isOnline()) {
            _this.upload();
          } else {
            //@TODO GA Track event
            _this.offlineOverlay();
          }
        });

        //GO BACK TO UPLOAD FORM
        $('.upload-another-button').on('click', function() {
          // RESET FORM STATUS
          $('.user_caption').val("");
          _this.removeUploadAnimation();
          $('.placeholder-wrapper').removeClass('has-image');

          // SHOW FORM
          $(this).parents('.animated').removeClass('show zoomIn');
          $('form.form-horizontal').removeClass('hidden').addClass('fadeIn');
        });

        // Try again button
        $('.try-again-button').on('click', function() {
          // Show form
          $(this).parents('.animated').removeClass('show zoomIn');
          $('form.form-horizontal').removeClass('hidden').addClass('fadeIn');

          // And try again
          if (Fliplet.Navigator.isOnline()) {
            _this.upload();
          } else {
            _this.offlineOverlay();
          }
        });

        // Store the name on a PV
        $name.on('change', function() {
          window.photoUserPV.name = $('.user_name').val();
          Fliplet.Security.Storage.update().then(function () {
            // Remove missing messages after the field changed if the message is there
            if (($(".name-missing").hasClass("show") && $name.val() !== "")) {
              _this.hideMissingName();
            }
          });
        });

        // "Back to all photos" click to close the overlay
        $('.back-feed').add('.cancel-upload-button').on('click', function() {
          _this.refresh();
          _this.overlay.close();
          $(".photo-feed-parent-holder").animate({ scrollTop: 0 }, 250);
        });

        // If we have the missing photo message hide it when we select an image
        $(".photo-upload").on("thumbCanvasReady", function() {
          _this.hideMissingPhoto();
          $('.placeholder-wrapper').addClass('has-image');
        });
      },
      attachObservers: function() {
        // When click the camera button
        $(".add-photo").click(function() {
          // @TODO: GA Track event
          if (Fliplet.Env.get('platform') === 'web') {
            Fliplet.Navigate.popup({
              popupTitle: 'Not yet available on web',
              popupMessage: 'This feature only works on your mobile device.'
            });
            return;
          }

          // Get the template
          var source = $(".photo_feed_upload").html();
          var template = Handlebars.compile(source);
          var html = template();

          // Create a new Overlay
          _this.overlay = new Fliplet.Utils.Overlay(html, {
            showOnInit: true,
            classes: 'photo-upload-overlay',
            title: 'Photo upload'
          }, _this.overlayInit);
        });

        // REFRESH BUTTON LISTENER
        $('.refresh').on('click', function() {
          // @TODO: GA Track event

          _this.refresh();

        });

        // Load More listener
        $('.load-more').on('click', function() {
          // @TODO: GA Track event

          $(this).addClass('loading').html('Loading <span class="fa fa-repeat"></span>');
          _this.renderImageFeed();
        });

        // First blink of camera icon
        setTimeout(_this.bPhotoFeed, 5000);

        document.addEventListener("offline", function(){
          _this.showOfflineMessage();
          _this.offlineOverlay();

          $('.add-photo').removeClass('ready');
        }, false);

        document.addEventListener("online", function(){
          _this.removeOfflineMessage();
          _this.onlineOverlay();

          $('.add-photo').addClass('ready');
        }, false);

      },
      // THIS SHOULD ONLY RUN ONCE
      bPhotoFeed: function() {
        $('.add-photo').addClass('rubberBand');
        setTimeout(function() {
          $('.add-photo').removeClass('rubberBand');
        }, 1000);
      },
      refresh: function() {
        if (Fliplet.Navigator.isOnline()) {
          _this.getFeed();
        } else {
          _this.showOfflineMessage();
        }
      },
      showRefreshAnimation: function() {
        $('.refresh').addClass('refreshing').html('Refreshing <span class="fa fa-refresh"></span>');
        setTimeout(function() {
          $('.refresh').removeClass('refreshing').html('Refresh <span class="fa fa-refresh"></span>');
        }, 10000);
      },
      hideRefreshAnimation: function() {
        var $refresh = $('.refresh');
        if ($refresh.hasClass('refreshing')) {
          $refresh.removeClass('refreshing').html('Refresh <span class="fa fa-refresh"></span>');
        }
      },
      moveElements: function() {
        // Selectors
        var $cameraButton = $('.add-photo');
        var $offlineMessage = $('.offline-warning');
        var $emptyFeedmsg = $('.empty-feed-msg');

        // Slide in Add Photo button
        setTimeout(function() {
          $('.add-photo').addClass('ready');
        }, 500);

      },
      // Show the offline message
      showOfflineMessage: function() {
        var $offlineWarning = $('.offline-warning');
        $offlineWarning.removeClass('fadeOutDown');
        $offlineWarning.addClass('fadeInUp ready');
      },

      removeOfflineMessage: function() {
        var $offlineWarning = $('.offline-warning');
        $offlineWarning.removeClass('fadeInUp');
        $offlineWarning.addClass('fadeOutDown');
        setTimeout(function() {
          $offlineWarning.removeClass('ready');
        }, 600);
      },

      offlineOverlay: function() {
        // Remove possibly previously added error notifications
        _this.hideMissingName();
        _this.hideMissingPhoto();

        // Show offline notification
        $('.offline-notification').addClass('show');
        $('.upload-button').removeClass('link-button-primary').addClass('link-button-secondary').prop('disabled', true);
      },

      onlineOverlay: function() {
        $('.offline-notification').removeClass('show');
        $('.upload-button').removeClass('link-button-secondary').addClass('link-button-primary').prop('disabled', false);
      },
      showMissingName: function() {
        $('.name-missing').addClass('show');
      },
      showMissingPhoto: function() {
        $('.image-missing').addClass('show');
      },
      hideMissingName: function() {
        $('.name-missing').removeClass('show');
      },
      hideMissingPhoto: function() {
        $('.image-missing').removeClass('show');
      },

      uploadAnimation: function() {
        // DISABLE FORM FIRST & CHANGE BUTTON TEXT
        $('.upload-button').addClass('uploading').html('Uploading <span class="fa fa-repeat"></span>');
        $('.form-holder').addClass('faded');
      },

      removeUploadAnimation: function() {
        // ENABLE FORM & CHANGE BUTTON TEXT
        $('.upload-button').removeClass('uploading').html('Upload photo');
        $('.form-holder').removeClass('faded');
      },

      // @TODO: Refactor upload
      //Make the upload
      upload: function() {

        var fields = {};
        var files = {};
        var formData;

        // Get fields
        var name = $(".user_name").val();
        var caption = $(".user_caption").val();

        // Check for errors
        var error = false;
        if (!imageBase64) {
          _this.showMissingPhoto();
          error = true;
        }
        if (name === "") {
          _this.showMissingName();
          error = true;
        }
        if (error) return;

        // Remove possibly previously added error notifications
        _this.hideMissingName();
        _this.hideMissingPhoto();

        // Show the upload animation
        _this.uploadAnimation();

        $('form.form-horizontal').find('[name]').each(function () {
          var $el = $(this);
          var name = $el.attr('name');
          var type = $el.attr('type');

          if (type === 'file') {
            files[name] = $el[0].files;
          } else {
            fields[name] = $el.val();
          }
        });

        if (!Fliplet.Navigator.isOnline()) {
          return alert('You must be connected to submit this form');
        }

        formData = new FormData();
        Object.keys(fields).forEach(function (fieldName) {
          formData.append(fieldName, fields[fieldName]);
        });
        formData.append('imageURL', imageBase64);
        formData.append('imageWidth', imgwidth);
        formData.append('imageHeight', imgheight);
        formData.append('uploadedAt', moment().format());
        formData = formData || fields;

        _this.getConnection().then(function (connection) {
          return connection.insert(formData, data.folder);
        }).then(function onSaved() {
          // Hide form
          $('form.form-horizontal').addClass('hidden');

          // Replace the canvas for an empty one
          $(".photo-upload").parent().html("<canvas class='photo-upload'></canvas>");

          // Delete the image from images
          imageBase64 = null;

          // Show success screen
          $('.success-screen').addClass('show zoomIn');

        }, function onError(error) {
          // @TODO: GA Track event

          // Hide form and show fail screen
          $('form.form-horizontal').addClass('hidden');
          $('.fail-screen').addClass('show zoomIn');
        });
      },
      getFeed: function() {
        _this.showRefreshAnimation();
        window.imagesLoaded = 0;

        if (Fliplet.Navigator.isOnline()) {

          _this.getConnection().then(function (connection) {
            return connection.find();
          }).then(function (rows) {
            rows = rows || [];

            _this.removeOfflineMessage();
            // Get the images
            window.feedImages = _this.processImageFeed(rows);

            // Clear the feed
            $(".stream-wrapper").html('');

            // Render the feed
            window.imagesLoaded = 0;
            _this.renderImageFeed();

            if (window.feedImages.length === 0) {
              $('.empty-feed-msg').show();
            } else if ( window.feedImages.length > 0 ) {
              $('.empty-feed-msg').hide();
            }

            // Show/hide messages and buttons
            if (window.imagesLoaded < window.feedImages.length) {
              $('.load-more').show();
            }

            $('.refresh').show();

            var $loadingMessageHolder = $('.photo-sharing-loading-holder');
            if ($loadingMessageHolder.hasClass('failed')) {
              $loadingMessageHolder.removeClass('failed');
            }
            $loadingMessageHolder.addClass('loaded');
            var $wrapper = $('.photo-sharing-wrapper');
            $wrapper.addClass('ready');
            _this.hideRefreshAnimation();
            _this.moveElements();

            // Calculate .image-container max-height and height
            var max_height = 400;

            var c_width = $('.image-container').width();
            $('.image-container').each(function(i){
              $(this).css({
                maxHeight: Math.min( max_height, window.feedImages[i].height ) + 'px',
                height: c_width * (window.feedImages[i].height/window.feedImages[i].width) + 'px'
              });
            });

            if ($wrapper.height() >= $(document).height()) {
              $('.reach-end').show();
            }
          }).catch(function (error) {
            $('.photo-sharing-loading-holder').addClass('loaded');
            $('.photo-sharing-wrapper').addClass('ready');
            _this.hideRefreshAnimation();

            if (!_this.config.dataSourceId) {
              console.warn('No data source configured.');
              return;
            }

            Fliplet.UI.Toast.error(error, {
              message: 'Error loading photo feed'
            });
          });

        } else {
          _this.hideRefreshAnimation();
          $('.photo-sharing-loading-holder').addClass('failed');
        }
      },
      // Prepare an array of images with all the needed fields to render them
      processImageFeed: function(submissions) {
        var images = [];
        var image = {};
        var submissionUrl = '';
        var submissionDate;

        // Sort by uploadedAt
        submissions = submissions.sort(function(a,b) {
          return moment(b.data.uploadedAt) - moment(a.data.uploadedAt);
        });

        for (var i = 0, l = submissions.length; i < l; i++) {
          submissionUrl = Fliplet.Media.authenticate(submissions[i].data.imageURL);
          submissionDate = submissions[i].data.uploadedAt;
          image = {
            url: submissionUrl,
            encodedURL: encodeURIComponent(submissionUrl),
            date: moment(submissionDate).fromNow(),
            name: submissions[i].data.Name,
            caption: submissions[i].data.Caption,
            width: submissions[i].data.imageWidth,
            height: submissions[i].data.imageHeight,
            appName: Fliplet.Env.get('appName')
          };
          images.push(image);

        }

        return images;
      },
      /**
       * Render the image feed
       * It takes all the images and using the imageChunkSize it render the images
       */
      renderImageFeed: function() {
        var source = $(".photo_feed_image").html();
        var template = Handlebars.compile(source);
        var imagesSlice = window.feedImages.slice(window.imagesLoaded, window.imagesLoaded + _this.imageChunkSize);
        if (imagesSlice.length) {
          var html = template(imagesSlice);
          $('.stream-wrapper').append(html);
          window.imagesLoaded += _this.imageChunkSize;
        }

        var $loadMore = $('.load-more');
        if (window.imagesLoaded >= window.feedImages.length) {
          $loadMore.hide();
        }

        $loadMore.removeClass('loading').html('Load more <span class="fa fa-repeat"></span>');
      }
    };

    // return module
    return PhotoFeed;
  }());

  if(Fliplet.Env.get('platform') === 'web') {
      initPhotoFeed();
      $('.photo-feed-parent-holder').parent().on("fliplet_page_reloaded", initPhotoFeed);
  } else {
    Fliplet.Navigator.onReady().then(initPhotoFeed);
  }

  function initPhotoFeed(){
      new PhotoFeed(data);
  }

});
