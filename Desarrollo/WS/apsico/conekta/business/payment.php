<?php

require_once("../bin/conekta-php-master/lib/Conekta.php");

class Payment
{

    private $ApiKey = "key_Amyc16UhY4646emUWvYwtw";
    private $ApiVersion = "2.0.0";

    public function __construct($token, $card, $name, $description, $monto, $email)
    {

        $this->token = $token;
        $this->card = $card;
        $this->name = $name;
        $this->description = $description;
        $this->monto = $monto;
        $this->email = $email;
    }

    public function pay()
    {

        \Conekta\Conekta::setApiKey($this->ApiKey);
        \Conekta\Conekta::setApiVersion($this->ApiVersion);

        if (!$this->validate()) {
            return false;
        }

        if (!$this->createCustomer()) {
            return false;
        }

        if (!$this->createOrder()) {
            return false;
        }

        return true;
    }

    public function createOrder()
    {

        try {
            $this->order = \Conekta\Order::create(
                array(
                    "amount" => $this->monto,
                    "line_items" => array(
                        array(
                            "name" => $this->description,
                            "unit_price" => $this->monto * 100,
                            "quantity" => 1
                        )
                    ),
                    "currency" => "MXN",
                    "customer_info" => array(
                        "customer_id" => $this->customer->id
                    ),
                    "charges" => array(
                        array(
                            "payment_method" => array(
                                "type" => "default"
                            )
                        )
                    )
                )
            );
        } catch (\Conekta\ProcessingError $error) {
            $this->error = $error->getMessage();
            return false;
        } catch (\Conekta\ParameterValidationError $error) {
            $this->error = $error->getMessage();
            return false;
        } catch (\Conekta\Handler $error) {
            $this->error = $error->getMessage();
            return false;
        }

        return true;
    }

    public function createCustomer()
    {

        try {
            $this->customer = \Conekta\Customer::create(
                array(
                    "name" => $this->name,
                    "email" => $this->email,
                    "payment_sources" => array(
                        array(
                            "type" => "card",
                            "token_id" => $this->token
                        )
                    )
                )
            );
        } catch (\Conekta\ProcessingError $error) {
            $this->error = $error->getMessage();
            return false;
        } catch (\Conekta\ParameterValidationError $error) {
            $this->error = $error->getMessage();
            return false;
        } catch (\Conekta\Handler $error) {
            $this->error = $error->getMessage();
            return false;
        }

        return true;
    }

    public function validate() 
    {
        if ($this->token == "" || $this->card == "" || $this->name == "" || $this->description == "" || $this->monto == "" || $this->email == "") {
            $this->error = "Información incompleta";
            return false;
        }

        if (strlen($this->card) <= 14) {
            $this->error = "El número de trarjeta debe tener al menos 15 caracteres";
            return false;
        }

        if (!filter_var($this->email, FILTER_VALIDATE_EMAIL)) {
            $this->error = "Correo incorrecto";
            return false;
        }

        if ($this->monto < 20) {
            $this->error = "El monto debe ser mayor de $20.00";
            return false;
        }

        return true;
    }
}
