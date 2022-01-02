<?php

require_once("./payment.php");
extract($_REQUEST);

$objPayment = new Payment($conektaTokenId, $card, $name, $description, $monto, $email);

if ($objPayment->pay()) {
    echo "1";
    $data = '{"costo":"' . $monto;
    $data .= '","id":"' . $id;
    $data .= '","fechaHoraFin":"' . $fechaHoraFin;
    $data .= '","fechaHoraInicio":"' . $fechaHoraInicio;
    $data .= '","idClient":"' . $idClient;
    $data .= '","idOferta":"' . $idOferta;
    $data .= '","reservations":"' . $reservations;
    $data .= '","token":"' . $opToken;
    $data .= '","owner":"' . $owner;
    $data .= '","pagado": false, "cobrado": true, "tipo":"' . $tipo . '"}';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://apsicodb.firebaseio.com/transacciones.json");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
    $response = curl_exec($ch);
    curl_close($ch);
} else {
    echo $objPayment->error;
}
