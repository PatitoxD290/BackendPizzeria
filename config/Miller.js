require("dotenv").config();
const nodemailer = require("nodemailer");

const codigosPago = {}; // Objeto separado para almacenar los códigos de pago

// Función para enviar el código de pago al correo
const codigoPago = async (req, res) => {
  const { email } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ message: "Correo electrónico inválido" });
  }

  const codigo = Math.floor(1000 + Math.random() * 9000);
  codigosPago[email] = codigo;

  console.log("Código de pago generado para:", email, "->", codigo);

  // Código expira en 5 minutos
  setTimeout(() => {
    delete codigosPago[email];
    console.log("Código de pago expirado para:", email);
  }, 5 * 60 * 1000);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "brayantitovasqueztorrez@gmail.com", // Aquí cambiamos la dirección de destino
    subject: "El codigo de tu pago es:",
    text: `Tu código de pago es: ${codigo}`,
    html: `<h1>Tu código de pago es: <strong>${codigo}</strong></h1>`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo de pago enviado a brayantitovasqueztorrez@gmail.com");
    res.status(200).json({ message: "Código de pago enviado correctamente" });
  } catch (error) {
    console.error("Error al enviar el código de pago:", error);
    res.status(500).json({ message: "Error al enviar el código de pago" });
  }
};

// Función para verificar el código de pago
const verificarPago = (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Falta el código de pago" });
  }

  const email = Object.keys(codigosPago).find(email => codigosPago[email] === parseInt(code));

  if (email) {
    delete codigosPago[email];
    console.log("Código de pago verificado para:", email);
    return res.status(200).json({ message: "Pago verificado correctamente", success: true });
  } else {
    console.log("Código de pago incorrecto o expirado:", code);
    return res.status(400).json({ message: "Código de pago incorrecto o expirado", success: false });
  }
};

module.exports = {
  codigoPago,
  verificarPago,
};
