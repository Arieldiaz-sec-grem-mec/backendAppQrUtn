
// ======================================
// Firebase imports (v9 modular)
// ======================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getFirestore,
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { enviarAGoogleSheets } from "./envioAsheets.js";

// ======================================
// CONFIG FIREBASE
// ======================================
const firebaseConfig = {
    apiKey: "AIzaSyCkdtN0c2LQNwIH8Nk8g_gtHNAcO5VZjTU",
    authDomain: "asistencias-qr-55719.firebaseapp.com",
    projectId: "asistencias-qr-55719",
    storageBucket: "asistencias-qr-55719.firebasestorage.app",
    messagingSenderId: "1027290983790",
    appId: "1:1027290983790:web:e2047cda658f551909a57f",
    measurementId: "G-4FPGBY0VVE"
};

// ======================================
// INIT
// ======================================
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Variables globales para almacenar datos
let todosLosUsuarios = [];

let todosCursos = [];

let todasAsistencias = [];
let alumnosAplanados = [];

// Función auxiliar para actualizar alumnos aplanados y enviar a Sheets
function actualizarYEnviarAlumnosAplanados(alumnos) {
    alumnosAplanados = aplanarAlumnos(alumnos);
    console.log("=== Alumnos Aplanados ===");
    console.log(alumnosAplanados);

    // Enviar a Google Sheets en tiempo real
    if (typeof enviarAGoogleSheets === 'function' && alumnosAplanados.length > 0) {
        enviarAGoogleSheets(alumnosAplanados);
    }
}

// Función para combinar todos los datos
function procesarAlumnos() {
    const alumnos = todosLosUsuarios
        .filter(u => u.rol?.toLowerCase() === "user")
        .map(u => {
            // Encontrar todas las asistencias de este alumno
            const asistenciasAlumno = todasAsistencias.filter(a => a.alumnoUid === u.uid);

            // Obtener IDs únicos de cursos que ha cursado
            const cursosIds = [...new Set(asistenciasAlumno.map(a => a.cursoId))];

            // Construir array de cursos con sus asistencias
            const cursosConAsistencias = cursosIds.map(cursoId => {
                // Buscar info del curso
                const cursoInfo = todosCursos.find(c => c.id === cursoId);

                // Filtrar asistencias de este curso específico
                const asistenciasCurso = asistenciasAlumno
                    .filter(a => a.cursoId === cursoId)
                    .sort((a, b) => {
                        // Ordenar de la más antigua a la más actual (de menor a mayor)
                        const fechaA = a.fecha?.seconds || 0;
                        const fechaB = b.fecha?.seconds || 0;
                        return fechaA - fechaB;
                    })
                    .map(a => {
                        // Formatear fecha de asistencia
                        let fechaAsistencia = "Sin fecha";
                        if (a.fecha && a.fecha.seconds) {
                            const date = new Date(a.fecha.seconds * 1000);
                            fechaAsistencia = date.toLocaleString('es-ES', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            });
                        }

                        return {
                            id: a.id,
                            fecha: fechaAsistencia,
                            cursoNombre: a.cursoNombre
                        };
                    });

                return {
                    cursoId: cursoId,
                    cursoNombre: cursoInfo ? cursoInfo.nombre : "Curso desconocido",
                    profesorId: cursoInfo ? cursoInfo.profesorId : null,
                    totalAsistencias: asistenciasCurso.length,
                    asistencias: asistenciasCurso
                };
            });

            return {
                id: u.id,
                uid: u.uid,
                nombre: u.nombre,
                apellido: u.apellido,
                creado: u.creado,
                empresa: u.empresa,
                rol: u.rol,
                email: u.email,
                cursos: cursosConAsistencias
            };
        });

    console.log("=== Alumnos con Cursos y Asistencias ===");
    console.log(alumnos);

    // Actualizar alumnos aplanados y enviar a Sheets
    actualizarYEnviarAlumnosAplanados(alumnos);

    return alumnos;
}

// Función para aplanar alumnos por curso con asistencias como columnas
function aplanarAlumnos(alumnos) {
    const resultado = [];

    alumnos.forEach(alumno => {
        alumno.cursos.forEach(curso => {
            // Crear objeto base con datos del alumno y curso
            const fila = {
                uid: alumno.uid,
                nombreCompleto: `${alumno.nombre} ${alumno.apellido}`,
                empresa: alumno.empresa,
                curso: curso.cursoNombre,
                totalAsistencias: curso.totalAsistencias
            };

            // Agregar cada asistencia como columna separada
            curso.asistencias.forEach((asistencia, index) => {
                fila[`asistencia_${index + 1}`] = asistencia.fecha;
            });

            resultado.push(fila);
        });
    });

    return resultado;
}

// ======================================
// LISTENER PARA CURSOS
// ======================================

const colRefCursos = collection(db, "cursos");

onSnapshot(colRefCursos, (snapshot) => {
    todosCursos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    console.log("=== Cursos ===");
    console.log();

    procesarAlumnos(); // Recalcular alumnos

}, (error) => {
    console.error("Error escuchando la colección cursos:", error);
});

// ======================================
// LISTENER PARA ASISTENCIAS
// ======================================
const colRefAsistencias = collection(db, "asistencias");

onSnapshot(colRefAsistencias, (snapshot) => {
    todasAsistencias = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    console.log("=== Asistencias ===");
    console.log();

    procesarAlumnos(); // Recalcular alumnos

}, (error) => {
    console.error("Error escuchando la colección asistencias:", error);
});

// ======================================
// LISTENER PARA USERS
// ======================================
const colRef = collection(db, "users");

onSnapshot(colRef, (snapshot) => {
    todosLosUsuarios = snapshot.docs.map(doc => {
        const data = doc.data();

        // Formatear la fecha
        let fechaFormateada = "Sin fecha";
        const ts = data.createdAt;

        if (ts && ts.seconds) {
            const date = new Date(ts.seconds * 1000);
            fechaFormateada = date.toLocaleString('es-ES', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        }

        return {
            id: doc.id,
            ...data,
            creado: fechaFormateada
        };
    });

    console.log("=== Usuarios ===");
    console.log(todosLosUsuarios);

    procesarAlumnos(); // Recalcular alumnos

    // Filtrar por profesores
    const profesores = todosLosUsuarios.filter(u => u.rol?.toLowerCase() === "profesor");

    console.log("=== ACTUALIZACIÓN: Profesores ===");
    console.log(profesores);

}, (error) => {
    console.error("Error escuchando la colección users:", error);
});
