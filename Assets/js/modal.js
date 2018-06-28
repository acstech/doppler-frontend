$(document).ready(function(){
    // makes the modal open when the page loads
    $('#exampleModalCenter').modal({
      backdrop: 'static',
      keyboard: false
    });
    // handles if there are any page size changes
    $('#exampleModalCenter').modal('handleUpdate');

    $('#filterSubmit').click(openMapResetModal);
});

/**
 * openMapResetModal opens a modal for resetting the map
 */
function openMapResetModal()  {
  // makes the modal open
  $('#resetMapModal').modal({
    keyboard: false
  })
  // handles if there are any page size changes
  $('#resetMapModal').modal('handleUpdate')
}
