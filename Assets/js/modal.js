$(document).ready(function(){
    // makes the modal open when the page loads
    $('#exampleModalCenter').modal({
      backdrop: 'static',
      keyboard: false
    });
    // handles if there are any page size changes
    $('#myModal').modal('handleUpdate');

    $("#mapRESET").click(openMapResetModal);
    $("#enter").click(submitClientID);
});

function openMapResetModal()  {
  // makes the modal open
  $('#resetMapModal').modal({
    keyboard: false
  })

  // handles if there are any page size changes
  $('#resetMapModal').modal('handleUpdate')
}

function submitClientID() {
  console.log(document.getElementById("cIDinput").value);
  var clientName = {clientID: document.getElementById("cIDinput").value};
  ws.send(JSON.stringify(clientName));
}
