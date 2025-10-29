'use client';

import { Suspense, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { loginAction } from '../../actions';
import AppLogo from '@/components/AppLogo';
import { author, currentYear } from '@/helpers';
import Link from 'next/link';
import { Button, Card, CardBody, Col, Form, FormControl, InputGroup, Row, Alert } from 'react-bootstrap';
import { useSearchParams } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <div className="d-grid">
      <Button type="submit" className="btn btn-primary fw-bold py-2" disabled={pending}>
        {pending ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </Button>
    </div>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  
  const [state, formAction] = useActionState(loginAction, null);

  return (
    <div className="auth-box p-0 w-100">
      <Row className="w-100 g-0">
        <Col>
          <div 
            className="h-100 position-relative card-side-img rounded-0 overflow-hidden"
            style={{
              backgroundImage: 'url(/uploads/ldba.jpeg)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat'
            }}
          >
            <div className="p-4 card-img-overlay auth-overlay d-flex align-items-end justify-content-center"></div>
          </div>
        </Col>

        <Col md="auto">
          <Card className="auth-box-form border-0 mb-0">
            <CardBody className="min-vh-100 d-flex flex-column justify-content-center">
              <div className="auth-brand mb-0 text-center">
                <AppLogo />
              </div>

              <div className="mt-auto text-center">
                <h4 className="fw-bold">Bienvenido a FixturePro</h4>
                <p className="text-muted auth-sub-text mx-auto">
                  Ingresa tu email y contraseña para continuar
                </p>

                {state?.error && (
                  <Alert variant="danger" className="mb-3 text-start">
                    {state.error}
                  </Alert>
                )}

                <Form action={formAction} className="mt-4">
                  <input type="hidden" name="callbackUrl" value={callbackUrl} />
                  
                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="email"
                        name="email"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        placeholder="tu@ejemplo.com"
                        required
                      />
                    </InputGroup>
                  </div>

                  <div className="mb-3">
                    <InputGroup>
                      <FormControl
                        type="password"
                        name="password"
                        className="py-2 px-3 bg-light bg-opacity-40 border-light"
                        placeholder="Contraseña"
                        required
                      />
                    </InputGroup>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="form-check">
                      <input 
                        className="form-check-input form-check-input-light fs-14" 
                        type="checkbox" 
                        id="rememberMe" 
                      />
                      <label className="form-check-label" htmlFor="rememberMe">
                        Mantenerme conectado
                      </label>
                    </div>

                    <Link 
                      href="/auth-3/reset-password" 
                      className="text-decoration-underline link-offset-3 text-muted"
                    >
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>

                  <SubmitButton />
                </Form>
              </div>


              <p className="text-center text-muted mt-auto mb-0">
                ©  {currentYear} FixturePro — by <span className="fw-semibold">{author}</span>
              </p>
            </CardBody>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <SignInForm />
    </Suspense>
  );
}
