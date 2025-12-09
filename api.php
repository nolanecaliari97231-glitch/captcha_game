<?php
// api.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Récupération sécurisée
$clickSequence = $_GET['clickSequence'] ?? '';
$zone = $_GET['zone'] ?? '';
$valid = $_GET['valid'] ?? '';

// Vérification simple
if ($clickSequence === 'reverse_ok' && $zone === '3' && $valid === 'true') {
    http_response_code(200);
    echo json_encode([
        "success" => true,
        "message" => "Validation serveur OK. Épreuve réussie."
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Erreur de validation serveur."
    ]);
}
?>