import express from "express";
import { getHomePage } from "../controllers/homeController";
import { loginHandler, signupHandler } from "../controllers/authController";
import { getLoginPage, postLogin, logout } from "../controllers/sessionController";
import { ensureLoggedIn } from "../middleware/sessionAuth";

const router = express.Router();

const initWebRoutes = (app) => {
    router.get('/', getHomePage);
    router.get('/login', getLoginPage);
    router.post('/login', postLogin);
    router.post('/logout', ensureLoggedIn(), logout);
    router.get('/logout', ensureLoggedIn(), logout);
    router.post('/api/auth/login', loginHandler);
    router.post('/api/auth/signup', signupHandler);
    return app.use("/", router);
};

export default initWebRoutes;
