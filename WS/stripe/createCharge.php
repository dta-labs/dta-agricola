<?php
    require_once('stripe/init.php');

    \Stripe\Stripe::setApiKey('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');

    $token = $_POST['stripeToken'];
    $email = $_POST['stripeEmail'];

    $name_first = "Miriam";
    $name_Last = "Echemendía";
    $address = "Calle 5a No 501";
    $zip = "31500";
    $state = "Chihuahua";
    $country = "México";
    $phone = "+526251523176";

    $user_info = array(
        "Client name" => $_POST["Client_name"], 
        "Address" => $_POST["Address"], 
        "Email" => $_POST["Email"], 
    );

    $customer = \Stripe\Customer::create(array(
        "email" => $email,
        "source" => $token,
        "metadata" => $user_info
    ));

    $charge = \Stripe\Charge::create([
        "amount" => $_POST["costo"] * 100,
        "description" => $_POST["type"] . " el " . $_POST["fechaHoraInicio"] . " cliente " . $_POST["Client_name"] . " oferta " . $_POST["idOferta"],
        "currency" => "mxn",
        "customer" => $customer->id,
        "metadata" => $user_info
    ]);

    // echo "<pre>", print_r($charge), "<pre>"
    // print_r($charge);

    $data = '{"costo":"' . $_POST["costo"];
    $data .= '","id":"' . $_POST["id"];
    $data .= '","fechaHoraFin":"' . $_POST["fechaHoraFin"];
    $data .= '","fechaHoraInicio":"' . $_POST["fechaHoraInicio"];
    $data .= '","idClient":"' . $_POST["idClient"];
    $data .= '","idOferta":"' . $_POST["idOferta"];
    $data .= '","reservations":"' . $_POST["reservations"];
    $data .= '","pagado": false,"tipo":"' . $_POST["type"] . '"}';

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://apsicodb.firebaseio.com/transacciones.json");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: text/plain'));
    $response = curl_exec($ch);
    curl_close($ch);

?>

<script>
    window.close();
</script>