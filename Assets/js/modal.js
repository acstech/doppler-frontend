$(document).ready(function(){
    // makes the modal open when the page loads
    $('#exampleModalCenter').modal({
      backdrop: 'static',
      keyboard: false
    });
    // handles if there are any page size changes
    $('#myModal').modal('handleUpdate');

    $("#mapRESET").click(openMapResetModal);
});

function openMapResetModal()  {
  // makes the modal ope
  $('#resetMapModal').modal({
    keyboard: false
  })

  // handles if there are any page size changes
  $('#resetMapModal').modal('handleUpdate')
}
