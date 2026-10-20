<?php
	// testgsm.php

	// Verificar si se recibió el parámetro 'id'
	if (isset($_GET['id'])) {
		$id = $_GET['id'];

		// Validar que el id sea el esperado
		if ($id === "dta_test_gsm") {
			echo "Comunicación completada correctamente";
		} else {
			echo "ID inválido";
		}
	} else {
		echo "Parámetro 'id' no recibido";
	}
?>