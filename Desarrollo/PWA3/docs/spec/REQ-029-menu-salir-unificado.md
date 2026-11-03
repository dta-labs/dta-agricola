# REQ-029 - Un solo boton de salida

| Campo | Valor |
|---|---|
| Estado | **Implementado** |
| Alcance | `index.html` (menu del avatar), `core.js` (se elimino `salirDesdeMenu`) |
| Pruebas | 123/123 en Node (5 nuevas) |
| Riesgo | Bajo |

## 1. Lo pedido

El boton "Salir" del menu del avatar debia llamar **a la misma funcion** que el del menu lateral:
`ng-click="showLogin()"`.

## 2. Estado anterior

| Boton | ng-click |
|---|---|
| Menu lateral (`#signoutBtn2`) | `showLogin()` |
| Menu del avatar | `salirDesdeMenu()` -> `$scope.logout()` |

Dos caminos distintos para la misma accion: mantenerlos sincronizados a mano es lo que hace que
un dia uno de los dos se quede atras.

## 3. Cambio

```html
<!-- antes -->
<a href="" ng-click="salirDesdeMenu()" ...> Salir </a>

<!-- ahora -->
<a href="" ng-click="menuUsuario = false; showLogin()" ...> Salir </a>
```

`menuUsuario = false` se mantiene en el propio `ng-click` porque el menu detiene la propagacion
del clic (`$event.stopPropagation()`), asi que sin eso el desplegable se quedaria abierto al salir.

`$scope.salirDesdeMenu` **se elimino** de `core.js`: ya no hay una segunda ruta de salida que
pueda desincronizarse.

## 4. Pruebas

`test/unit/menu-salir.test.js` lee el HTML y el controlador y comprueba:

1. el boton del menu lateral usa `showLogin()`;
2. el boton del menu del avatar existe y usa `showLogin()`;
3. **los dos llaman a la misma funcion**;
4. el menu del avatar ya no menciona `salirDesdeMenu`;
5. `core.js` ya no define `salirDesdeMenu`.

Asi, si alguien vuelve a separar los dos botones, el test falla.

## 5. Aviso importante

`showLogin()` -> `$scope.login()` -> `showWindow("login")` **solo cambia la vista** al login; **no
cierra la sesion de Firebase**. Es el mismo comportamiento que ya tenia el boton del menu lateral.

Si se espera que "Salir" cierre la sesion, hay que anadir `$scope.logout()` antes de `showLogin()`
en los **dos** botones. Se deja asi porque es lo que se pidio.
