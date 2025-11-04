// Função de Login
function fazerLogin() {
  const user = document.getElementById("usuario").value.trim();
  const pass = document.getElementById("senha").value.trim();

  const users = JSON.parse(localStorage.getItem("users")) || [];

  const userFound = users.find(u => u.user === user && u.pass === pass);

  if (userFound) {
    sessionStorage.setItem("logado", "true");
    window.location.href = "index.html";
  } else {
    document.getElementById("msgErro").textContent = "Usuário ou senha incorretos!";
  }
}

// Função de Cadastro
function cadastrarUsuario() {
  const user = document.getElementById("usuario").value.trim();
  const pass = document.getElementById("senha").value.trim();

  if (!user || !pass) {
    document.getElementById("msgErro").textContent = "Preencha usuário e senha!";
    return;
  }

  let users = JSON.parse(localStorage.getItem("users")) || [];

  if (users.some(u => u.user === user)) {
    document.getElementById("msgErro").textContent = "Usuário já existe!";
    return;
  }

  users.push({ user, pass });
  localStorage.setItem("users", JSON.stringify(users));

  document.getElementById("msgErro").textContent = "";
  document.getElementById("msgOk").textContent = "Usuário cadastrado com sucesso!";
}
