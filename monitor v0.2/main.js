// Creación del módulo
var app = angular.module("angularRoutingApp", ["ngRoute"]);

// Configuración de las rutas
app.config(function ($routeProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "home.html",
            controller: "mainController",
        })
        .when("/acerca", {
          templateUrl: "acerca.html",
          controller: "aboutController",
        })
        .when("/contacto", {
          templateUrl: "contacto.html",
          controller: "contactController",
        })
        .otherwise({
            redirectTo: "/",
        });
});

app.controller("mainController", function ($scope) {
    $scope.message = "Hola, Mundo!";
});

app.controller("aboutController", function ($scope) {
    $scope.message = 'Esta es la página "Acerca de"';
});

app.controller("contactController", function ($scope) {
    $scope.message =
        'Esta es la página de "Contacto", aquí podemos poner un formulario';
});