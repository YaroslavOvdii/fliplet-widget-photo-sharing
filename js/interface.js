var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var $dataSource = $('select[name="dataSource"]');
var organizationId = Fliplet.Env.get('organizationId');
var folderData;
var providerFilePickerInstance;
var filePickerData = data.folderData || {};;

data.folder = $.extend(true, {}, data.folder);

function filePickerDataInit() {
  folderData = $.extend(true, {
    selectedFiles: {},
    selectFiles: [], // To use the restore on File Picker
    selectMultiple: false,
    type: 'folder'
  }, data.folderData);
}

function reloadDataSources(dataSourceId) {
  return Fliplet.DataSources.get({
    type: null
  }, {
    cache: false
  }).then(function(results) {
    allDataSources = results;
    $dataSource.html('<option value="none">-- Select a data source</option><option disabled>------</option><option value="new">Create a new data source</option><option disabled>------</option>');
    allDataSources.forEach(function (d) {
      $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
    });

    if (dataSourceId) {
      $dataSource.val(dataSourceId);
    }
    $dataSource.trigger('change');
  });
}

function createDataSource() {
  var name = prompt('Please type a name for your data source:');

  if (name === null) {
    $dataSource.val('none').trigger('change');
    return;
  }

  if (name === '') {
    $dataSource.val('none').trigger('change');
    alert('You must enter a data source name');
    return;
  }

  Fliplet.DataSources.create({
    name: name, organizationId:
    organizationId
  }).then(function (d) {
    $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
    $dataSource.val(d.id);
  });
};

// init
filePickerDataInit();

Fliplet.DataSources.get({
  organizationId: organizationId
}).then(function (dataSources) {
  dataSources.forEach(function (d) {
    $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
  });

  if (data.dataSourceId) {
    $dataSource.val(data.dataSourceId);
  }
});

$('.folder-btn-holder').on('click', '.select-folder', function() {

  Fliplet.Widget.toggleSaveButton(data.folderData && data.folderData.selectFiles && data.folderData.selectFiles.length > 0);

  Fliplet.Studio.emit('widget-save-label-update', {
    text: 'Select'
  });

  providerFilePickerInstance = Fliplet.Widget.open('com.fliplet.file-picker', {
    data: folderData,
    onEvent: function(e, data) {
      switch (e) {
        case 'widget-rendered':
          break;
        case 'widget-set-info':
          Fliplet.Widget.toggleSaveButton(!!data.length);
          var msg = data.length ? data.length + ' files selected' : 'no selected files';
          Fliplet.Widget.info(msg);
          break;
        default:
          break;
      }
    }
  });

  providerFilePickerInstance.then(function(data) {
    Fliplet.Widget.info('');
    Fliplet.Widget.toggleCancelButton(true);
    Fliplet.Widget.toggleSaveButton(true);
    filePickerData.selectFiles = data.data.length ? data.data : [];
    providerFilePickerInstance = null;
    Fliplet.Studio.emit('widget-save-label-update', {
      text: 'Save & Close'
    });
    if (filePickerData.selectFiles.length) {
      $('.folder-btn-holder .select-folder').text('Replace folder');
      $('.folder-btn-holder .info-holder').removeClass('hidden');
      $('.folder-btn-holder .folder-title span').text(filePickerData.selectFiles[0].name);
    }
  });
});

$('#manage-data').on('click', function() {
  var dataSourceId = $dataSource.val();
  Fliplet.Studio.emit('overlay', {
    name: 'widget',
    options: {
      size: 'large',
      package: 'com.fliplet.data-sources',
      title: 'Edit Data Sources',
      classes: 'data-source-overlay',
      data: {
        context: 'overlay',
        dataSourceId: dataSourceId
      }
    }
  });
});

$('.browse-files').on('click', function(e) {
  e.preventDefault();
  
  Fliplet.Studio.emit('overlay', {
    name: 'widget',
    options: {
      size: 'large',
      package: 'com.fliplet.file-manager',
      title: 'File Manager',
      classes: 'data-source-overlay',
      data: {
        context: 'overlay',
        appId: Fliplet.Env.get('appId'),
        folder: filePickerData.selectFiles[0],
        navStack: filePickerData.selectFiles[1]
      }
    }
  });
});

$dataSource.on( 'change', function() {
  var selectedDataSourceId = $(this).val();
  if (selectedDataSourceId && selectedDataSourceId !== 'none' && selectedDataSourceId !== 'new') {
    $('#manage-data').removeClass('hidden');
  } else {
    $('#manage-data').addClass('hidden');
  }

  if (selectedDataSourceId === 'new') {
    createDataSource();
  }
});

Fliplet.Studio.onMessage(function(event) {
  if (event.data && event.data.event === 'overlay-close') {
    reloadDataSources(event.data.data.dataSourceId);
  }
});

// 1. Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
  if (providerFilePickerInstance) {
    return providerFilePickerInstance.forwardSaveRequest();
  }

  $('form').submit();
});

// 2. Fired when the user submits the form
$('form').submit(function (event) {
  event.preventDefault();
  var email = $('#report_email').val();
  emailValidate(email);
});

function emailValidate(email) {
  var pattern = new RegExp(/^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/);
  // Allows saving empty
  if (email === "") {
    $('#report_email').parents('.form-group').removeClass('has-error');
    save(true);
  } else {
    if (pattern.test(email)) {
      $('#report_email').parents('.form-group').removeClass('has-error');
      save(true);
    } else {
      $('#report_email').parents('.form-group').addClass('has-error');
      $('#report_email').trigger('focus');
      return;
    }
  }
}

function save(notifyComplete) {
  data.reportEmail = $('#report_email').val();
  data.dataSourceId = $dataSource.val();
  data.folderData = filePickerData && !_.isEmpty(filePickerData) ? filePickerData : data.folder.data;
  data.folder.folderId = filePickerData && !_.isEmpty(filePickerData) ? filePickerData.selectFiles[0].id : data.folder.folderId;

  Fliplet.Widget.save(data).then(function () {
    if (notifyComplete) {
      Fliplet.Widget.complete();
      window.location.reload();
    } else {
      Fliplet.Studio.emit('reload-widget-instance', widgetId);
    }
  });
}

$('#help_tip').on('click', function() {
  alert("During beta, please use live chat and let us know what you need help with.");
});
