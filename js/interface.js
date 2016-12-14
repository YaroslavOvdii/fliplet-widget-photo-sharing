var widgetId = Fliplet.Widget.getDefaultId();
var data = Fliplet.Widget.getData() || {};
var $dataSource = $('select[name="dataSource"]');
var organizationId = Fliplet.Env.get('organizationId');

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

$('[data-create-source]').click(function (event) {
  event.preventDefault();
  var name = prompt('Please type a name for your data source:');

  if (!name) {
    return;
  }

  Fliplet.DataSources.create({
    name: name, organizationId:
    organizationId
  }).then(function (d) {
    $dataSource.append('<option value="' + d.id + '">' + d.name + '</option>');
    $dataSource.val(d.id);
  });
});

// 1. Fired from Fliplet Studio when the external save button is clicked
Fliplet.Widget.onSaveRequest(function () {
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
